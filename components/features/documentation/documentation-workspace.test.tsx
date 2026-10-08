import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/ui/data-display/data-table";
import { DocumentationWorkspace } from "./documentation-workspace";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import type { DocumentationTemplate, PatientDocument } from "@/lib/entity/documentation";
const { translations } = vi.hoisted(() => ({ translations: { t: (key: string) => key } }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => translations }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./document-signing", () => ({ DocumentSigning: () => <p>Signing prepared document</p> }));
vi.mock("@/lib/utils/notify", () => ({ notify: { error: vi.fn() } }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { templates: vi.fn(), patients: vi.fn(), doctors: vi.fn(), prepare: vi.fn(), documents: vi.fn(), document: vi.fn(), pdf: vi.fn() } }));
const template: DocumentationTemplate = { id: "template-a", name: "Variables", version: 1, createdAt: "2026-10-03", blocks: [{ type: "TEXT", text: "{{paciente.nombre}} {{doctor.licencia}}" }, { type: "SIGNATURE" }] };
const document: PatientDocument = { id: "doc-a", templateId: "template-a", templateVersion: 1, patientId: "patient-a", patientName: "Paciente Ficticio", title: "Variables", status: "PENDING", createdAt: "2026-10-03", documentHash: "hash" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(service.templates).mockResolvedValue([template]);
  vi.mocked(service.patients).mockResolvedValue([{ id: "patient-a", name: "Paciente Ficticio" }]);
  vi.mocked(service.doctors).mockResolvedValue([{ id: "doctor-a", name: "Doctor Ficticio" }]);
  vi.mocked(service.prepare).mockResolvedValue(document);vi.mocked(service.document).mockResolvedValue(document);vi.mocked(service.pdf).mockResolvedValue(new Blob(["PDF"]));vi.mocked(service.documents).mockResolvedValue([document]);
});
async function selectPatient() {
  fireEvent.click(await screen.findByRole("button", { name: "documentation.prepare" }));
  fireEvent.change(screen.getByLabelText("documentation.patientSearch"), { target: { value: "Paciente" } });
  fireEvent.submit(screen.getByLabelText("documentation.patientSearch").closest("form")!);
  fireEvent.change(await screen.findByLabelText("documentation.patient"), { target: { value: "patient-a" } });
}
describe("preparing documents with variables", () => {
  it("requires a selected document date and sends it only at preparation", async () => {
    const dated={ ...template, blocks: [{ type: "TEXT" as const, text: "{{fecha_documento:seleccionada}}" }, { type: "SIGNATURE" as const }] };
    vi.mocked(service.templates).mockResolvedValue([dated]);
    render(<DocumentationWorkspace />);await selectPatient();
    const prepare=screen.getAllByRole("button", { name: "documentation.prepare" })[0];
    expect(prepare).toBeDisabled();
    fireEvent.change(screen.getByLabelText("documentation.documentDate"), { target: { value: "2026-09-15" } });
    expect(service.prepare).not.toHaveBeenCalled();
    fireEvent.click(prepare);
    await waitFor(() => expect(service.prepare).toHaveBeenCalledWith(dated,"patient-a",undefined,"2026-09-15"));
  });
  it("requires a doctor when referenced and sends the selected identity only", async () => {
    render(<DocumentationWorkspace />);await selectPatient();
    expect(screen.getAllByRole("button", { name: "documentation.prepare" })[0]).toBeDisabled();
    fireEvent.change(screen.getByLabelText("documentation.doctorSearch"), { target: { value: "Doctor" } });
    fireEvent.submit(screen.getByLabelText("documentation.doctorSearch").closest("form")!);
    fireEvent.change(await screen.findByLabelText("documentation.doctor"), { target: { value: "doctor-a" } });
    expect(service.prepare).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "documentation.prepare" })[0]);
    await screen.findByText("Signing prepared document");
    expect(service.prepare).toHaveBeenCalledWith(template, "patient-a", "doctor-a");
  });
  it("retains a patient-only flow for templates without doctor variables", async () => {
    const patientTemplate = { ...template, blocks: [{ type: "TEXT" as const, text: "{{paciente.nombre}}" }, { type: "SIGNATURE" as const }] };
    vi.mocked(service.templates).mockResolvedValue([patientTemplate]);
    render(<DocumentationWorkspace />);await selectPatient();
    expect(screen.queryByLabelText("documentation.doctorSearch")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "documentation.prepare" })[0]);
    await waitFor(() => expect(service.prepare).toHaveBeenCalledWith(patientTemplate, "patient-a", undefined));
    expect(service.doctors).not.toHaveBeenCalled();
  });
  it("does not prepare after an empty or failed doctor search", async () => {
    vi.mocked(service.doctors).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Network error"));
    render(<DocumentationWorkspace />);await selectPatient();
    const query=screen.getByLabelText("documentation.doctorSearch");
    fireEvent.change(query, { target: { value: "Doctor" } });fireEvent.submit(query.closest("form")!);
    await screen.findByText("documentation.noDoctors");
    fireEvent.submit(query.closest("form")!);await screen.findByRole("alert");
    expect(screen.getAllByRole("button", { name: "documentation.prepare" })[0]).toBeDisabled();
    expect(service.prepare).not.toHaveBeenCalled();
  });
});

describe("template table", () => {
  it("uses the shared table with template columns and row actions", async () => {
    render(<DocumentationWorkspace />);
    const table=screen.getByRole("table");
    expect(within(table).getByRole("columnheader",{name:"documentation.name"})).toBeInTheDocument();
    expect(within(table).getByRole("columnheader",{name:"documentation.version"})).toBeInTheDocument();
    expect(within(table).getByRole("columnheader",{name:"documentation.actions"})).toBeInTheDocument();
    const row=(await within(table).findByText("Variables")).closest("tr")!;
    expect(within(row).getByRole("button",{name:"documentation.edit"})).toBeEnabled();
    expect(within(row).getByRole("button",{name:"documentation.prepare"})).toBeEnabled();
  });
  it("shows the empty state inside the shared table", async () => {
    vi.mocked(service.templates).mockResolvedValue([]);
    render(<DocumentationWorkspace />);
    expect(await within(screen.getByRole("table")).findByText("documentation.empty")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"app.table.nextPage"})).toBeDisabled();
  });
  it("keeps offset pagination without inventing a total count", async () => {
    vi.mocked(service.templates).mockResolvedValueOnce(Array.from({length:11},(_,index)=>({...template,id:`template-${index}`,name:`Template ${index}`}))).mockResolvedValueOnce([]);
    render(<DocumentationWorkspace />);
    await screen.findByText("Template 9");
    fireEvent.click(screen.getByRole("button",{name:"app.table.nextPage"}));
    await waitFor(()=>expect(service.templates).toHaveBeenCalledWith(10,11));
    await screen.findByText("documentation.empty");
    expect(screen.getByRole("button",{name:"app.table.previousPage"})).toBeEnabled();
  });
});

describe("shared pagination compatibility", () => {
  it("retains total-count pagination used by users and patients", () => {
    const change=vi.fn();
    render(<DataTable columns={[{key:"name",title:"Name",dataIndex:"name"}]} data={[{id:"row",name:"Row"}]} page={2} pageSize={10} total={30} onPageChange={change} />);
    fireEvent.click(screen.getByRole("button",{name:"app.table.nextPage"}));
    expect(change).toHaveBeenCalledWith(3,10);
    fireEvent.click(screen.getByRole("button",{name:"app.table.previousPage"}));
    expect(change).toHaveBeenCalledWith(1,10);
  });
  it("resets template pagination when the page size changes", async () => {
    render(<DocumentationWorkspace />);
    await screen.findByText("Variables");
    fireEvent.change(screen.getByLabelText("app.table.pageSizeAria"),{target:{value:"20"}});
    await waitFor(()=>expect(service.templates).toHaveBeenCalledWith(0,21));
  });
});
