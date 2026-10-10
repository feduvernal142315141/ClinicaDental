import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignableDocument } from "./signable-document";
import { documentationService } from "@/lib/services/documentation/documentation.service";
import type { PatientDocument } from "@/lib/entity/documentation";
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { signingPage: vi.fn() } }));
const document = { id: "test", title: "Consent", documentHash: "hash" } as PatientDocument;
beforeEach(() => { vi.resetAllMocks(); vi.mocked(documentationService.signingPage).mockResolvedValue({ page: 0, pageCount: 1, width: 600, height: 800, imageDataUrl: "data:image/png;base64,test", documentHash: "hash", fields: [{ x: 60, top: 400, width: 200, height: 100, signerRole: "SPECIALIST" }] }); });
describe("document signature fields", () => {
  it("places the interactive field over its exact PDF region and selects its signer", async () => {
    const onSign = vi.fn();
    render(<SignableDocument document={document} disabled={false} signatures={{}} onSign={onSign} />);
    const field = await screen.findByRole("button", { name: /documentation.specialistSignature/ });
    expect(field).toHaveStyle({ left: "10%", top: "50%", height: "12.5%" });
    fireEvent.click(field); expect(onSign).toHaveBeenCalledWith("SPECIALIST");
    expect(screen.queryByRole("button", { name: "consultationDocuments.next" })).not.toBeInTheDocument();
  });
  it("shows captured ink in the document and returns to the signing prompt when cleared", async () => {
    const onSign = vi.fn();
    const { rerender } = render(<SignableDocument document={document} disabled={false} signatures={{ SPECIALIST: "data:image/png;base64,ink" }} onSign={onSign} />);
    expect(await screen.findByAltText("documentation.specialistSignature")).toHaveAttribute("src", "data:image/png;base64,ink");
    expect(screen.queryByText("documentation.signHere")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /documentation.specialistSignature/ }));
    expect(onSign).toHaveBeenCalledWith("SPECIALIST");
    rerender(<SignableDocument document={document} disabled={false} signatures={{}} onSign={onSign} />);
    expect(screen.queryByAltText("documentation.specialistSignature")).not.toBeInTheDocument();
    expect(screen.getByText("documentation.signHere")).toBeInTheDocument();
  });
  it("shows and removes electronic acceptance only in the patient field", async () => {
    const page = await documentationService.signingPage("test", 0);
    vi.mocked(documentationService.signingPage).mockResolvedValue({ ...page, fields: [...page.fields, { ...page.fields[0], signerRole: "PATIENT" }] });
    const { rerender } = render(<SignableDocument document={document} disabled={false} patientAccepted onSign={vi.fn()} />);
    expect(await screen.findByText("documentation.acceptanceVisible")).toBeInTheDocument();
    expect(screen.getAllByText("documentation.signHere")).toHaveLength(1);
    rerender(<SignableDocument document={document} disabled={false} patientAccepted={false} onSign={vi.fn()} />);
    expect(screen.queryByText("documentation.acceptanceVisible")).not.toBeInTheDocument();
    expect(screen.getAllByText("documentation.signHere")).toHaveLength(2);
  });
  it("renders successive pages together without page navigation buttons", async () => {
    const first = await documentationService.signingPage("test", 0);
    vi.mocked(documentationService.signingPage).mockImplementation(async (_id, page = 0) => ({ ...first, page, pageCount: 2, fields: page === 1 ? first.fields : [] }));
    render(<SignableDocument document={document} disabled={false} onSign={vi.fn()} />);
    expect(await screen.findByAltText("Consent — 2")).toBeInTheDocument();
    expect(screen.getByAltText("Consent — 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /documentation.specialistSignature/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "consultationDocuments.previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "consultationDocuments.next" })).not.toBeInTheDocument();
  });
  it("jumps to the pending signature field and hides the shortcut after signing", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
    const page = await documentationService.signingPage("test", 0);
    vi.mocked(documentationService.signingPage).mockResolvedValue({ ...page, fields: [{ ...page.fields[0], signerRole: "PATIENT" }, ...page.fields] });
    const { rerender } = render(<div data-testid="scroll-container" style={{ height: 300, overflowY: "auto" }}><SignableDocument document={document} allowedRoles={["SPECIALIST"]} disabled={false} signatures={{}} onSign={vi.fn()} /></div>);
    const jump = await screen.findByRole("button", { name: "documentation.goToSignature" });
    const container = screen.getByTestId("scroll-container");
    const scrollTo = vi.fn();
    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1200 },
      scrollTo: { configurable: true, value: scrollTo },
    });
    container.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
    const field = screen.getByRole("button", { name: /documentation.specialistSignature/ });
    field.getBoundingClientRect = () => ({ top: 700, height: 100 } as DOMRect);
    fireEvent.click(jump);
    expect(scrollTo).toHaveBeenCalledWith({ top: 600, behavior: "smooth" });
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(field).toHaveFocus();
    expect(field.className).toContain("ring-4");
    rerender(<SignableDocument document={document} allowedRoles={["SPECIALIST"]} disabled={false} signatures={{ SPECIALIST: "data:image/png;base64,ink" }} onSign={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "documentation.goToSignature" })).not.toBeInTheDocument();
  });
  it("filters specialist fields even if the public loader returns one", async () => {
    const first = await documentationService.signingPage("test", 0);
    const loader = vi.fn().mockResolvedValue({ ...first, fields: [...first.fields, { ...first.fields[0], signerRole: "PATIENT" }] });
    render(<SignableDocument document={document} disabled={false} loadPage={loader} allowedRoles={["PATIENT"]} onSign={vi.fn()} />);
    expect(await screen.findByRole("button", { name: /documentation.patientSignature/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /documentation.specialistSignature/ })).not.toBeInTheDocument();
  });
  it("moves the floating shortcut inward only for the patient view", async () => {
    const { rerender } = render(<SignableDocument document={document} disabled={false} patientView onSign={vi.fn()} />);
    const patientShortcut = (await screen.findByRole("button", { name: "documentation.goToSignature" })).parentElement;
    expect(patientShortcut).toHaveClass("left-[clamp(1rem,12vw,14rem)]");
    rerender(<SignableDocument document={document} disabled={false} onSign={vi.fn()} />);
    expect(screen.getByRole("button", { name: "documentation.goToSignature" }).parentElement).toHaveClass("left-3", "sm:left-6");
  });
  it("does not expose signature controls for a different document hash", async () => {
    vi.mocked(documentationService.signingPage).mockResolvedValue({ page: 0, pageCount: 1, width: 600, height: 800, imageDataUrl: "data:image/png;base64,test", documentHash: "other", fields: [] });
    render(<SignableDocument document={document} disabled={false} signatures={{}} onSign={vi.fn()} />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
