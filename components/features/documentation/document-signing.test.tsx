import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentSigning } from "./document-signing";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import type { PatientDocument } from "@/lib/entity/documentation";

vi.mock("@/components/ui", () => ({
  Button: ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => <button {...props} disabled={props.disabled || loading}>{children}</button>,
}));
vi.mock("@/lib/contexts/i18n-context", () => {
  const t = (key: string) => key;
  return { useI18n: () => ({ t }) };
});
vi.mock("@/lib/utils/notify", () => ({ notify: { error: vi.fn() } }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { previewSignature: vi.fn(), sign: vi.fn() } }));
vi.mock("./pdf-preview", () => ({ PdfPreview: () => null }));
vi.mock("./signature-pad", () => ({ SignaturePad: ({ onChange, label }: { onChange: (value?: string) => void; label?: string }) => <>
  <button onClick={() => onChange(label ? "data:image/png;base64,specialist" : "data:image/png;base64,drawing")}>{label ? "draw-specialist" : "draw-stroke"}</button>
  <button onClick={() => onChange(undefined)}>{label ? "clear-specialist" : "clear-stroke"}</button>
</> }));
const document: PatientDocument = {
  id: "document-a", templateId: "template-a", templateVersion: 3, patientId: "patient-a", patientName: "Paciente de prueba",
  title: "Consentimiento", status: "PENDING", createdAt: "2026-10-02T10:00:00Z", documentHash: "hash-a",
};
const pdf = new Blob(["pdf"], { type: "application/pdf" });
const confirm = () => screen.getByRole("button", { name: "documentation.confirmSign" });
const preview = () => screen.getByRole("button", { name: "documentation.previewSignature" });
const acceptance = () => screen.getByRole("checkbox");
const renderDocument = () => {
  const onSigned = vi.fn();
  render(<DocumentSigning document={document} initialPdf={pdf} onSigned={onSigned} onClose={vi.fn()} />);
  return onSigned;
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(service.previewSignature).mockResolvedValue(pdf);
  vi.mocked(service.sign).mockResolvedValue({ ...document, status: "SIGNED", method: "CHECKBOX" });
});

describe("patient document signing", () => {
  it("requires explicit acceptance and successful preview before saving checkbox acceptance", async () => {
    const onSigned = renderDocument();
    expect(acceptance()).not.toBeChecked();
    expect(preview()).toBeDisabled();
    expect(confirm()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "documentation.checkbox" }));
    expect(acceptance()).not.toBeChecked();
    fireEvent.click(acceptance());
    expect(confirm()).toBeDisabled();
    fireEvent.click(preview());
    await waitFor(() => expect(confirm()).toBeEnabled());
    expect(service.previewSignature).toHaveBeenCalledWith("document-a", { method: "CHECKBOX", accepted: true, documentHash: "hash-a" });
    fireEvent.click(confirm());
    await waitFor(() => expect(onSigned).toHaveBeenCalledOnce());
    expect(service.sign).toHaveBeenCalledWith("document-a", { method: "CHECKBOX", accepted: true, documentHash: "hash-a" });
  });
  it("invalidates the preview when acceptance changes, even after it is checked again", async () => {
    renderDocument();
    fireEvent.click(screen.getByRole("radio", { name: "documentation.checkbox" }));
    fireEvent.click(acceptance()); fireEvent.click(preview());
    await waitFor(() => expect(confirm()).toBeEnabled());
    fireEvent.click(acceptance()); fireEvent.click(acceptance());
    expect(confirm()).toBeDisabled();
    expect(service.sign).not.toHaveBeenCalled();
  });
  it("invalidates drawn previews when a stroke changes or the method changes", async () => {
    renderDocument();
    fireEvent.click(screen.getByText("draw-stroke")); fireEvent.click(acceptance()); fireEvent.click(preview());
    await waitFor(() => expect(confirm()).toBeEnabled());
    expect(service.previewSignature).toHaveBeenCalledWith("document-a", expect.objectContaining({ method: "DRAWN", signatureBase64: "data:image/png;base64,drawing", documentHash: "hash-a" }));
    fireEvent.click(screen.getByText("clear-stroke"));
    expect(confirm()).toBeDisabled(); expect(preview()).toBeDisabled();
    fireEvent.click(screen.getByText("draw-stroke")); fireEvent.click(preview());
    await waitFor(() => expect(confirm()).toBeEnabled());
    fireEvent.click(screen.getByRole("radio", { name: "documentation.checkbox" }));
    expect(confirm()).toBeDisabled(); expect(acceptance()).not.toBeChecked();
  });
  it("never allows confirmation after a failed PDF preview", async () => {
    vi.mocked(service.previewSignature).mockRejectedValue(new Error("network"));
    renderDocument();
    fireEvent.click(screen.getByRole("radio", { name: "documentation.checkbox" }));
    fireEvent.click(acceptance()); fireEvent.click(preview());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("documentation.error"));
    expect(confirm()).toBeDisabled(); expect(service.sign).not.toHaveBeenCalled();
  });
  it("requires the specialist signature even when the patient accepts by checkbox", async () => {
    render(<DocumentSigning document={{ ...document, signatureRoles: ["PATIENT", "SPECIALIST"] }} initialPdf={pdf} onSigned={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: "documentation.checkbox" })); fireEvent.click(acceptance());
    expect(preview()).toBeDisabled();
    fireEvent.click(screen.getByText("draw-specialist")); fireEvent.click(preview());
    await waitFor(() => expect(confirm()).toBeEnabled());
    expect(service.previewSignature).toHaveBeenCalledWith("document-a", { method: "CHECKBOX", accepted: true, documentHash: "hash-a", specialistSignatureBase64: "data:image/png;base64,specialist" });
    fireEvent.click(screen.getByText("clear-specialist"));
    expect(confirm()).toBeDisabled(); expect(preview()).toBeDisabled(); expect(service.sign).not.toHaveBeenCalled();
  });
});
