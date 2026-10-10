import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ConsultationDocuments } from "./consultation-documents";
import { useConsultationDocuments } from "./consultation-documents-context";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import { servicesService } from "@/lib/services/services/services.service";
import type { VisitDocuments } from "@/lib/entity/documentation";

// Radix tooltips measure their anchor; jsdom does not implement ResizeObserver.
beforeAll(() => vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
}));
afterAll(() => vi.unstubAllGlobals());

const state = vi.hoisted(() => ({ readOnly: false, clinicalEvents: [
  { id: "a", type: "plan", status: "plan", serviceId: "service-a", toothNumber: 18, surfaces: [], procedureName: "Procedure A" },
  { id: "b", type: "plan", status: "plan", serviceId: "service-a", toothNumber: 48, surfaces: [], procedureName: "Procedure B" },
] }));
vi.mock("@/lib/odontogram/store", () => ({ useOdontogramStore: (selector: (s: typeof state) => unknown) => selector(state) }));
vi.mock("@/lib/contexts/i18n-context", () => { const t = (key: string) => key; return { useI18n: () => ({ t }) }; });
vi.mock("@/lib/utils/notify", () => ({ notify: { error: vi.fn() } }));
vi.mock("@/components/ui", async () => ({ ...(await import("@/components/ui/primitives/shadcn/dialog")), Button: ({ children, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => <button data-variant={variant} {...props}>{children}</button>, Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/features/documentation/pdf-preview", () => ({ PdfPreview: () => null }));
vi.mock("@/components/features/documentation/document-signing", () => ({ DocumentSigning: () => <div>Signing</div> }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { restartVisitDocument: vi.fn(), signatureRequestStatus: vi.fn(), visitDocuments: vi.fn(), prepareVisitDocuments: vi.fn(), template: vi.fn(), pdf: vi.fn() } }));
vi.mock("@/lib/services/services/services.service", () => ({ servicesService: { getServiceById: vi.fn() } }));
const bundle = (required = true): VisitDocuments => ({ visitId: "visit-a", patientId: "patient-a", selectionHash: "version-1", eventIds: ["a"], groups: [{ templateId: "template-a", signatureRequired: required, document: { id: "document-a", templateId: "template-a", templateVersion: 1, patientId: "patient-a", patientName: "Synthetic", title: "Consent", status: "PENDING", createdAt: "2026-10-09", documentHash: "hash" }, treatments: [{ eventId: "a", serviceId: "service-a", serviceName: "Procedure A", toothNumber: 18, surfaces: [] }] }] });
function Stage() { const value = useConsultationDocuments(); return <button onClick={() => value?.stage(["a","b"])}>Stage teeth</button>; }
const openReview = async () => {
  await waitFor(() => expect(service.visitDocuments).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText("consultationDocuments.loading")).not.toBeInTheDocument());
  await act(async () => {});
};
beforeEach(() => { vi.resetAllMocks(); vi.mocked(service.signatureRequestStatus).mockResolvedValue({ status: "NONE" }); state.readOnly = false; state.clinicalEvents = [
  { id: "a", type: "plan", status: "plan", serviceId: "service-a", toothNumber: 18, surfaces: [], procedureName: "Procedure A" },
  { id: "b", type: "plan", status: "plan", serviceId: "service-a", toothNumber: 48, surfaces: [], procedureName: "Procedure B" },
]; vi.mocked(service.visitDocuments).mockResolvedValue(bundle());
  vi.mocked(servicesService.getServiceById).mockResolvedValue({ documentationTemplateId: "template-a" } as Awaited<ReturnType<typeof servicesService.getServiceById>>);
  vi.mocked(service.template).mockResolvedValue({ id: "template-a", name: "Consent", version: 1, blocks: [], createdAt: "2026-10-09" });
  vi.mocked(service.prepareVisitDocuments).mockImplementation(async (_visit, input) => ({ ...bundle(), eventIds: input.eventIds, groups: [], selectionHash: "version-2" }));
});
describe("consultation document workflow", () => {
  it("restores a pending signing dialog even outside the documentation tab", async () => {
    vi.mocked(service.signatureRequestStatus).mockResolvedValue({ status: "SENT", expiresAt: "2099-01-01T00:00:00Z" });
    render(<ConsultationDocuments documentationView={false} visitId="visit-a" persist={vi.fn()}><Stage /></ConsultationDocuments>);
    expect(await screen.findByText("Signing")).toBeInTheDocument();
    expect(service.signatureRequestStatus).toHaveBeenCalledWith("document-a");
    expect(service.prepareVisitDocuments).not.toHaveBeenCalled();
  });
  it("shows the pending signature notice without a completion action", async () => {
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}><Stage /></ConsultationDocuments>);
    await openReview();
    expect(screen.queryByRole("button", { name: "consultationDocuments.complete" })).not.toBeInTheDocument();
    expect(screen.getByText("consultationDocuments.blocked")).toBeInTheDocument();
  });
  it("collects different teeth once, saves plans before preparing, and sends the optimistic token", async () => {
    vi.mocked(service.visitDocuments).mockResolvedValue({ ...bundle(), eventIds: [], groups: [] });
    vi.mocked(servicesService.getServiceById).mockResolvedValue({ documentationTemplateId: "template-a" } as Awaited<ReturnType<typeof servicesService.getServiceById>>);
    vi.mocked(service.template).mockResolvedValue({ id: "template-a", name: "Consent", version: 1, blocks: [], createdAt: "2026-10-09" });
    vi.mocked(service.prepareVisitDocuments).mockImplementation(async (_visit, input) => ({ ...bundle(), eventIds: input.eventIds, groups: input.draftOnly ? [] : bundle().groups, selectionHash: "version-2" }));
    const persist = vi.fn().mockResolvedValue(undefined);
    render(<ConsultationDocuments visitId="visit-a" persist={persist}><Stage /></ConsultationDocuments>);
    await openReview();
    fireEvent.click(screen.getByText("Stage teeth"));
    fireEvent.click(screen.getByText("Stage teeth"));
    fireEvent.click(await screen.findByRole("button", { name: /consultationDocuments.generateDocument: Consent/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "consultationDocuments.generate" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.generate" }));
    await waitFor(() => expect(service.prepareVisitDocuments).toHaveBeenCalledWith("visit-a", { eventIds: ["a","b"], expectedSelectionHash: "version-2", templateIds: ["template-a"], observations: {} }));
    expect(servicesService.getServiceById).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Signing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "consultationDocuments.sign" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "documentation.readDocument" })).not.toBeInTheDocument();
  });
  it("shows historical documents without mutation or signing controls", async () => {
    state.readOnly = true;
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}><Stage /></ConsultationDocuments>);
    await openReview();
    expect(screen.getByText("Consent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "consultationDocuments.complete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "consultationDocuments.sign" })).not.toBeInTheDocument();
  });
  it("preserves staged treatments when switching from the odontogram to documentation", async () => {
    vi.mocked(service.visitDocuments).mockResolvedValue({ ...bundle(), eventIds: [], groups: [] });
    const persist = vi.fn().mockResolvedValue(undefined);
    const view = render(<ConsultationDocuments documentationView={false} visitId="visit-a" persist={persist}><Stage /></ConsultationDocuments>);
    await waitFor(() => expect(service.visitDocuments).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("consultationDocuments.loading")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage teeth"));
    await waitFor(() => expect(service.prepareVisitDocuments).toHaveBeenCalled());
    view.rerender(<ConsultationDocuments documentationView visitId="visit-a" persist={persist}><Stage /></ConsultationDocuments>);
    expect(await screen.findByRole("cell", { name: "2" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Consent/ })).toBeInTheDocument();
  });
  it("edits one document at a time and preserves its fields when selecting another", async () => {
    vi.mocked(service.visitDocuments).mockResolvedValue({ ...bundle(), eventIds: ["a","b"], groups: [] });
    state.clinicalEvents[1].serviceId = "service-b";
    vi.mocked(servicesService.getServiceById).mockImplementation(async id => ({ documentationTemplateId: id === "service-a" ? "template-a" : "template-b" } as Awaited<ReturnType<typeof servicesService.getServiceById>>));
    vi.mocked(service.template).mockImplementation(async id => ({ id, name: id === "template-a" ? "Consent A" : "Consent B", version: 1, blocks: [{ type: "TEXT", text: "{{observaciones:Details}}", alignment: "LEFT" }], createdAt: "2026-10-09" }));
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}><Stage /></ConsultationDocuments>);
    fireEvent.click(await screen.findByRole("button", { name: /Consent A/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Details" }), { target: { value: "First document details" } });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: /Consent B/ }));
    expect(screen.getByRole("textbox", { name: "Details" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "consultationDocuments.next" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Details" }), { target: { value: "Second document details" } });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: /Consent A/ }));
    expect(screen.getByRole("textbox", { name: "Details" })).toHaveValue("First document details");
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.next" }));
    expect(screen.getByRole("button", { name: "consultationDocuments.generate" })).toBeEnabled();
  });

  it("opens a modal and advances one required field at a time, preserving values on back", async () => {
    vi.mocked(service.visitDocuments).mockResolvedValue({ ...bundle(), eventIds: ["a"], groups: [] });
    vi.mocked(service.template).mockResolvedValue({ id: "template-a", name: "Consent", version: 1, blocks: [{ type: "TEXT", text: "{{observaciones:Treatment}} {{observaciones:Instructions}}", alignment: "LEFT" }], createdAt: "2026-10-09" });
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}><Stage /></ConsultationDocuments>);
    fireEvent.click(await screen.findByRole("button", { name: /Consent/ }));
    expect(screen.getByRole("dialog", { name: "Consent" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "consultationDocuments.next" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Treatment" }), { target: { value: "Treatment details" } });
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.next" }));
    expect(screen.getByRole("textbox", { name: "Instructions" })).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.previous" }));
    expect(screen.getByRole("textbox", { name: "Treatment" })).toHaveValue("Treatment details");
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.next" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "Instructions details" } });
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.next" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Treatment details")).toBeInTheDocument();
    expect(screen.getByText("Instructions details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "consultationDocuments.generate" })).toBeEnabled();
  });

  it("shows and sends the selected date before observations", async () => {
    vi.mocked(service.visitDocuments).mockResolvedValue({ ...bundle(), eventIds: ["a"], groups: [] });
    vi.mocked(service.template).mockResolvedValue({ id: "template-a", name: "Consent", version: 1, blocks: [{ type: "TEXT", text: "{{fecha_documento:seleccionada:DMY_SLASH:Fecha de cirugía}}" }], createdAt: "2026-10-09" });
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}><Stage /></ConsultationDocuments>);
    fireEvent.click(await screen.findByRole("button", { name: /Consent/ }));
    expect(screen.getByText("Fecha de cirugía")).toBeInTheDocument();
    const date = screen.getByLabelText("Fecha de cirugía");
    fireEvent.change(date, { target: { value: "2026-10-11" } });
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.next" }));
    expect(screen.getByRole("button", { name: "consultationDocuments.generate" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.generate" }));
    await waitFor(() => expect(service.prepareVisitDocuments).toHaveBeenCalledWith("visit-a", expect.objectContaining({ documentDates: { "template-a": "2026-10-11" } })));
  });

  it("automatically removes a deleted tooth treatment and refreshes its remaining document group", async () => {
    const initial = bundle();
    initial.eventIds = ["a", "b"];
    initial.groups[0].treatments.push({ ...initial.groups[0].treatments[0], eventId: "b", toothNumber: 48 });
    vi.mocked(service.visitDocuments).mockResolvedValueOnce(initial).mockResolvedValue({ ...initial, eventIds: ["b"], groups: [], selectionHash: "version-2" });
    const persist = vi.fn().mockResolvedValue(undefined);
    const view = render(<ConsultationDocuments visitId="visit-a" persist={persist}>{null}</ConsultationDocuments>);
    await openReview();
    state.clinicalEvents = state.clinicalEvents.filter(event => event.id !== "a");
    view.rerender(<ConsultationDocuments visitId="visit-a" persist={persist}>{null}</ConsultationDocuments>);
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(service.visitDocuments).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("cell", { name: "1" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /consultationDocuments.generateDocument: Consent/ })).toBeInTheDocument();
    expect(screen.queryByText(/Procedure A/)).not.toBeInTheDocument();
  });
  it("removes the document when its last treatment is deleted", async () => {
    vi.mocked(service.visitDocuments).mockResolvedValueOnce(bundle()).mockResolvedValue({ ...bundle(), eventIds: [], groups: [] });
    const persist = vi.fn().mockResolvedValue(undefined);
    const view = render(<ConsultationDocuments visitId="visit-a" persist={persist}>{null}</ConsultationDocuments>);
    await openReview();
    state.clinicalEvents = [];
    view.rerender(<ConsultationDocuments visitId="visit-a" persist={persist}>{null}</ConsultationDocuments>);
    await waitFor(() => expect(service.visitDocuments).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Consent")).not.toBeInTheDocument());
    expect(persist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "consultationDocuments.viewTreatments" })).not.toBeInTheDocument();
  });

  it("persists additions and rebuilds pending documents on remount", async () => {
    let saved: VisitDocuments = { ...bundle(), eventIds: [], groups: [] };
    vi.mocked(service.visitDocuments).mockImplementation(async () => saved);
    vi.mocked(service.prepareVisitDocuments).mockImplementation(async (_visit, input) => {
      saved = { ...saved, eventIds: input.eventIds, selectionHash: "version-2" };
      return saved;
    });
    const persist = vi.fn().mockResolvedValue(undefined);
    const view = render(<ConsultationDocuments visitId="visit-a" persist={persist}><Stage /></ConsultationDocuments>);
    await openReview();fireEvent.click(screen.getByText("Stage teeth"));
    await waitFor(() => expect(service.prepareVisitDocuments).toHaveBeenCalledWith("visit-a", {
      eventIds: ["a","b"], expectedSelectionHash: "version-1", draftOnly: true,
    }));
    expect(await screen.findByRole("button", { name: /Consent/ })).toBeInTheDocument();
    await openReview();
    expect(await screen.findByRole("button", { name: /Consent/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
    view.unmount();
    render(<ConsultationDocuments visitId="visit-a" persist={persist}><Stage /></ConsultationDocuments>);
    expect(await screen.findByRole("button", { name: /Consent/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });
  it("keeps the saved selection and reports a failed addition", async () => {
    vi.mocked(service.prepareVisitDocuments).mockRejectedValue(new Error("save failed"));
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn().mockResolvedValue(undefined)}><Stage /></ConsultationDocuments>);
    await openReview();fireEvent.click(screen.getByText("Stage teeth"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
  });



  it("does not reload the previous selection while persist temporarily makes the odontogram read-only", async () => {
    let finishSave!: () => void;
    const persist = vi.fn(() => new Promise<void>(resolve => { finishSave = resolve; }));
    const view = () => <ConsultationDocuments visitId="visit-a" persist={persist}><Stage /></ConsultationDocuments>;
    const rendered = render(view());
    await openReview();
    fireEvent.click(screen.getByText("Stage teeth"));
    await waitFor(() => expect(persist).toHaveBeenCalled());
    state.readOnly = true;
    rendered.rerender(view());
    await act(async () => {});
    expect(service.visitDocuments).toHaveBeenCalledTimes(1);
    state.readOnly = false;
    rendered.rerender(view());
    await act(async () => { finishSave(); });
    await waitFor(() => expect(service.prepareVisitDocuments).toHaveBeenCalledWith("visit-a", expect.objectContaining({eventIds:["a","b"], draftOnly:true})));
    expect(service.visitDocuments).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole("button", { name: "consultationDocuments.viewTreatments" }));
    expect(screen.getByText("Procedure B · consultationDocuments.tooth 48")).toBeInTheDocument();
  });

});


describe("document table", () => {
  it("groups shared services in one row and counts distinct teeth", async () => {
    const current = bundle();
    current.eventIds = ["a", "b"];
    current.groups[0].treatments.push({ ...current.groups[0].treatments[0], eventId: "b", toothNumber: 48 });
    vi.mocked(service.visitDocuments).mockResolvedValue(current);
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
    await openReview();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Procedure A")).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "2" })).toBeInTheDocument();
    fireEvent.click(within(table).getByRole("button", { name: "consultationDocuments.sign" }));
    expect(await screen.findByText("Signing")).toBeInTheDocument();
  });
  it("counts a tooth only once when multiple services share its document", async () => {
    const current = bundle();
    current.eventIds = ["a", "b"];
    state.clinicalEvents[1].serviceId = "service-b";
    state.clinicalEvents[1].toothNumber = 18;
    current.groups[0].treatments.push({ ...current.groups[0].treatments[0], eventId: "b", serviceId: "service-b", serviceName: "Procedure B" });
    vi.mocked(service.visitDocuments).mockResolvedValue(current);
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
    await openReview();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Procedure A, Procedure B")).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "1" })).toBeInTheDocument();
  });
  it("restarts only after confirmation, retains selection and opens the draft wizard", async () => {
    const signed = bundle(); signed.groups[0].document.status = "SIGNED";
    vi.mocked(service.visitDocuments).mockResolvedValue(signed);
    vi.mocked(service.restartVisitDocument).mockResolvedValue({ ...signed, groups: [], selectionHash: "version-2" });
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
    await openReview();
    expect(screen.getByRole("button", { name: "consultationDocuments.viewSigned" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.restart" }));
    expect(service.restartVisitDocument).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.confirmRestart" }));
    await waitFor(() => expect(service.restartVisitDocument).toHaveBeenCalledWith("visit-a", "document-a", "version-1"));
    expect(await screen.findByRole("dialog", { name: "Consent" })).toBeInTheDocument();
    expect(service.prepareVisitDocuments).not.toHaveBeenCalled();
    expect(screen.getByRole("cell", { name: "1", hidden: true })).toBeInTheDocument();
  });
  it("keeps the signed document when restart fails", async () => {
    const signed = bundle(); signed.groups[0].document.status = "SIGNED";
    vi.mocked(service.visitDocuments).mockResolvedValue(signed);
    vi.mocked(service.restartVisitDocument).mockRejectedValue(new Error("Conflict"));
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.restart" }));
    fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.confirmRestart" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getByRole("dialog", { name: "consultationDocuments.restart" })).toBeInTheDocument();
    expect(service.prepareVisitDocuments).not.toHaveBeenCalled();
  });
  it("does not offer restart in historical visits or for completed treatments", async () => {
    state.clinicalEvents[0].status = "done";
    const signed = bundle(); signed.groups[0].document.status = "SIGNED";
    vi.mocked(service.visitDocuments).mockResolvedValue(signed);
    render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
    await openReview();
    expect(screen.queryByRole("button", { name: "consultationDocuments.restart" })).not.toBeInTheDocument();
  });
});


it("generates only the selected row even when another document has unfinished fields", async () => {
  vi.mocked(service.visitDocuments).mockResolvedValue({ ...bundle(), eventIds: ["a", "b"], groups: [] });
  state.clinicalEvents[1].serviceId = "service-b";
  vi.mocked(servicesService.getServiceById).mockImplementation(async id => ({ documentationTemplateId: id === "service-a" ? "template-a" : "template-b" } as Awaited<ReturnType<typeof servicesService.getServiceById>>));
  vi.mocked(service.template).mockImplementation(async id => ({ id, name: id === "template-a" ? "Consent A" : "Consent B", version: 1, blocks: [{ type: "TEXT", text: "{{observaciones:Details}}" }], createdAt: "2026-10-09" }));
  vi.mocked(service.prepareVisitDocuments).mockResolvedValue({ ...bundle(), eventIds: ["a", "b"] });
  render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
  fireEvent.click(await screen.findByRole("button", { name: /generateDocument: Consent A/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Details" }), { target: { value: "Only A" } });
  fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.next" }));
  fireEvent.click(screen.getByRole("button", { name: "consultationDocuments.generate" }));
  await waitFor(() => expect(service.prepareVisitDocuments).toHaveBeenCalledWith("visit-a", {
    eventIds: ["a", "b"], expectedSelectionHash: "version-1", templateIds: ["template-a"], observations: { "template-a": { Details: "Only A" } },
  }));
  expect(await screen.findByText("Signing")).toBeInTheDocument();
});

it("shows only the chosen document treatments through an icon action", async () => {
  render(<ConsultationDocuments visitId="visit-a" persist={vi.fn()}>{null}</ConsultationDocuments>);
  await openReview();
  expect(screen.queryByText(/consultationDocuments.selectedTreatments/)).not.toBeInTheDocument();
  const action = screen.getByRole("button", { name: "consultationDocuments.viewTreatments" });
  expect(action.textContent).toBe("");
  fireEvent.click(action);
  const dialog = screen.getByRole("dialog", { name: "consultationDocuments.viewTreatments" });
  expect(within(dialog).getByText("Procedure A · consultationDocuments.tooth 18")).toBeInTheDocument();
  expect(within(dialog).queryByText(/48/)).not.toBeInTheDocument();
});
