import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signatureEvents } from "@/lib/services/documentation/signature-events";
import { DocumentSigning } from "./document-signing";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import type { PatientDocument } from "@/lib/entity/documentation";
vi.mock("@/lib/services/documentation/signature-events", () => ({ signatureEvents: vi.fn() }));
vi.mock("@/components/ui", async () => ({ ...(await import("@/components/ui/primitives/shadcn/dialog")), Button: ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => <button {...props} disabled={props.disabled || loading}>{children}</button> }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/utils/notify", () => ({ notify: { error: vi.fn() } }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { signatureRequestStatus: vi.fn(), requestSignature: vi.fn(), document: vi.fn() } }));
vi.mock("./signable-document", () => ({ SignableDocument: ({ allowedRoles, onSign }: { allowedRoles: string[]; onSign: (role: string) => void }) => <>{allowedRoles.map(role => <button key={role} onClick={() => onSign(role)}>{role}</button>)}</> }));
vi.mock("./signature-pad", () => ({ SignaturePad: ({ onChange }: { onChange: (value?: string) => void }) => <button onClick={() => onChange("data:image/png;base64,specialist")}>draw</button> }));
const document: PatientDocument = { id: "document-a", templateId: "template-a", templateVersion: 3, patientId: "patient-a", patientName: "Paciente de prueba", title: "Consentimiento", status: "PENDING", createdAt: "2026-10-02T10:00:00Z", documentHash: "hash-a", signatureRoles: ["PATIENT", "SPECIALIST"] };
const renderDocument = () => { const onSigned = vi.fn(); render(<DocumentSigning document={document} initialPdf={new Blob()} onSigned={onSigned} onClose={vi.fn()} />); return onSigned; };
afterEach(() => vi.useRealTimers());
beforeEach(() => { vi.resetAllMocks(); vi.mocked(signatureEvents).mockImplementation(async (_id, _signal, callback) => { await callback(await service.signatureRequestStatus("document-a")); }); vi.mocked(service.signatureRequestStatus).mockResolvedValue({ status: "NONE" }); vi.mocked(service.requestSignature).mockResolvedValue({ status: "SENT", phoneMasked: "***1234", expiresAt: "2099-10-10T12:00:00Z" }); });
describe("remote patient signature from staff", () => {
  it("exposes only specialist capture and requires it before WhatsApp delivery", async () => {
    renderDocument();
    expect(screen.queryByRole("button", { name: "PATIENT" })).not.toBeInTheDocument();
    const send = screen.getByRole("button", { name: "documentation.remoteSend" });
    await waitFor(() => expect(service.signatureRequestStatus).toHaveBeenCalled());
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "SPECIALIST" })); fireEvent.click(screen.getByText("draw")); fireEvent.click(screen.getByText("documentation.remoteSignAndSend"));
    await waitFor(() => expect(service.requestSignature).toHaveBeenCalledWith("document-a", { documentHash: "hash-a", specialistSignatureBase64: "data:image/png;base64,specialist" }));
  });
  it("refreshes the signed document without accepting a patient signature from staff", async () => {
    vi.mocked(service.signatureRequestStatus).mockResolvedValue({ status: "SIGNED" }); vi.mocked(service.document).mockResolvedValue({ ...document, status: "SIGNED" });
    const onSigned = renderDocument();
    await screen.findByText("documentation.remoteReceived");
    expect(onSigned).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("documentation.remoteContinue"));
    expect(onSigned).toHaveBeenCalledWith(expect.objectContaining({status:"SIGNED"}));
    expect(service.requestSignature).not.toHaveBeenCalled();
  });
  it("keeps send disabled when initial status cannot be verified", async () => {
    vi.mocked(service.signatureRequestStatus).mockRejectedValue(new Error("offline")); renderDocument();
    expect(await screen.findByRole("alert")).toBeInTheDocument(); expect(screen.getByText("documentation.remoteSend")).toBeDisabled();
  });
  it("detects a patient signature on another device automatically", async () => {
    vi.useFakeTimers();
    vi.mocked(service.signatureRequestStatus).mockResolvedValueOnce({status:"SENT",expiresAt:new Date(Date.now()+300000).toISOString()}).mockResolvedValue({status:"SIGNED"});
    vi.mocked(service.document).mockResolvedValue({...document,status:"SIGNED"});
    const onSigned=renderDocument();
    await act(async()=>{});
    expect(screen.getByText("documentation.remoteWaiting")).toBeInTheDocument();
    await act(async()=>{await vi.mocked(signatureEvents).mock.calls[0][2]({status:"SIGNED"})});
    expect(screen.getByText("documentation.remoteReceived")).toBeInTheDocument();
    expect(onSigned).not.toHaveBeenCalled();
    await act(async()=>{vi.advanceTimersByTime(19999)});
    expect(onSigned).not.toHaveBeenCalled();
    await act(async()=>{vi.advanceTimersByTime(1)});
    expect(onSigned).toHaveBeenCalledTimes(1);
  });
  it("reconnects after transport failure without polling and shows expiration", async () => {
    vi.useFakeTimers();
    vi.mocked(signatureEvents).mockImplementationOnce(async (_id, _signal, callback) => { await callback({status:"SENT",expiresAt:new Date(Date.now()+10000).toISOString()}); throw new Error("offline"); }).mockImplementationOnce(async (_id, _signal, callback) => { await callback({status:"EXPIRED"}); });
    renderDocument(); await act(async()=>{});
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await act(async()=>{vi.advanceTimersByTime(1000)});
    expect(screen.getByText("documentation.remoteExpiredStaff")).toBeInTheDocument();
    expect(screen.queryByText("documentation.remoteWaiting")).not.toBeInTheDocument();
    expect(service.signatureRequestStatus).not.toHaveBeenCalled();
  });
  it("blocks application shortcuts and removes exit actions only while waiting", async () => {
    vi.mocked(signatureEvents).mockImplementationOnce(async (_id, _signal, callback) => {
      await callback({status:"SENT",expiresAt:new Date(Date.now()+300000).toISOString()});
    });
    renderDocument();
    await screen.findByText("documentation.remoteWaiting");
    expect(screen.queryByText("documentation.close")).not.toBeInTheDocument();
    expect(screen.queryByText("documentation.remoteRefresh")).not.toBeInTheDocument();
    const shortcut = vi.fn();
    window.document.addEventListener("keydown", shortcut);
    try {
      fireEvent.keyDown(window.document, {key:"k", ctrlKey:true});
      expect(shortcut).not.toHaveBeenCalled();
      await act(async()=>{await vi.mocked(signatureEvents).mock.calls[0][2]({status:"EXPIRED"})});
      fireEvent.keyDown(window.document, {key:"k", ctrlKey:true});
      expect(shortcut).toHaveBeenCalledTimes(1);
      expect(screen.getByText("documentation.close")).toBeEnabled();
    } finally { window.document.removeEventListener("keydown", shortcut); }
  });

});
