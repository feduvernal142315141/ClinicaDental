import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicDocumentSigning } from "./public-document-signing";
import { publicSigningService as service } from "@/lib/services/documentation/public-signing.service";
vi.mock("@/components/ui", async () => ({ ...(await import("@/components/ui/primitives/shadcn/dialog")), Button: ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => <button {...props} disabled={props.disabled || loading}>{children}</button> }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/services/documentation/public-signing.service", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/services/documentation/public-signing.service")>()), publicSigningService: { context: vi.fn(), page: vi.fn(), preview: vi.fn(), sign: vi.fn() } }));
vi.mock("./signable-document", () => ({ SignableDocument: ({ allowedRoles, onSign }: { allowedRoles: string[]; onSign: (role: string) => void }) => <>{allowedRoles.map(role => <button key={role} onClick={() => onSign(role)}>{role}</button>)}</> }));
vi.mock("./signature-pad", () => ({ SignaturePad: ({ onChange }: { onChange: (value?: string) => void }) => <button onClick={() => onChange("data:image/png;base64,patient")}>draw</button> }));
vi.mock("./pdf-preview", () => ({ PdfPreview: () => null }));
const token = "a".repeat(43);
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); window.history.replaceState(null, "", `/firmar-documento#token=${token}`);
  vi.mocked(service.context).mockResolvedValue({ id: "doc", title: "Consent", patientName: "Test", documentHash: "hash", expiresAt: new Date(Date.now() + 300_000).toISOString(), signatureRoles: ["PATIENT"] });
  vi.mocked(service.preview).mockResolvedValue(new Blob(["pdf"])); vi.mocked(service.sign).mockResolvedValue();
});
afterEach(() => vi.useRealTimers());
describe("patient-only signing", () => {
  it("removes the token from the URL, hides specialist, and requires signature and acceptance without mandatory preview", async () => {
    render(<PublicDocumentSigning />);
    fireEvent.click(await screen.findByRole("button", { name: "PATIENT" }));
    expect(window.location.hash).toBe(""); expect(service.context).toHaveBeenCalledWith(token);
    expect(screen.queryByRole("button", { name: "SPECIALIST" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("draw")); fireEvent.click(screen.getByText("documentation.useSignature"));
    const confirm = screen.getByText("documentation.confirmSign"); expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox")); expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled(); fireEvent.click(confirm);
    await screen.findByText("documentation.remoteDone");
    expect(sessionStorage.getItem("document-signing-session")).toBeNull();
    expect(service.preview).not.toHaveBeenCalled();
    expect(service.sign).toHaveBeenCalledWith(token, { method: "DRAWN", accepted: true, documentHash: "hash", signatureBase64: "data:image/png;base64,patient" });
  });
  it("submits explicit checkbox acceptance without any drawn or specialist signature", async () => {
    render(<PublicDocumentSigning />);
    fireEvent.click(await screen.findByRole("button", { name: "PATIENT" }));
    fireEvent.click(screen.getByRole("radio", { name: "documentation.checkbox" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("checkbox"));
    fireEvent.click(screen.getByText("documentation.useSignature"));
    expect(screen.getByText("documentation.confirmSign")).toBeEnabled();
    fireEvent.click(screen.getByText("documentation.confirmSign"));
    await screen.findByText("documentation.remoteDone");
    expect(sessionStorage.getItem("document-signing-session")).toBeNull();
    expect(service.preview).not.toHaveBeenCalled();
    expect(service.sign).toHaveBeenCalledWith(token, { method: "CHECKBOX", accepted: true, documentHash: "hash" });
  });
  it("does not offer a separate PDF preview action", async () => {
    render(<PublicDocumentSigning />);
    await screen.findByRole("button", { name: "PATIENT" });
    expect(screen.queryByText("documentation.previewSignature")).not.toBeInTheDocument();
    expect(screen.getByText("documentation.confirmSign")).toBeInTheDocument();
  });
  it("removes the document and capture modal when the link expires", async () => {
    vi.useFakeTimers(); render(<PublicDocumentSigning />); await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "PATIENT" }));
    await act(async () => { vi.advanceTimersByTime(300_001); });
    expect(screen.getByText("documentation.remoteUnavailable")).toBeInTheDocument();
    expect(sessionStorage.getItem("document-signing-session")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(service.sign).not.toHaveBeenCalled();
  });
  it("does not fetch a document without a token", () => {
    window.history.replaceState(null, "", "/firmar-documento"); render(<PublicDocumentSigning />);
    expect(screen.getByText("documentation.remoteUnavailable")).toBeInTheDocument(); expect(service.context).not.toHaveBeenCalled();
  });
  it("restores the token on reload without extending its server expiry", async () => {
    const first = render(<PublicDocumentSigning />);
    await screen.findByRole("button", { name: "PATIENT" });
    const saved = sessionStorage.getItem("document-signing-session");
    first.unmount();
    render(<PublicDocumentSigning />);
    await screen.findByRole("button", { name: "PATIENT" });
    expect(service.context).toHaveBeenLastCalledWith(token);
    expect(sessionStorage.getItem("document-signing-session")).toBe(saved);
    expect(window.location.hash).toBe("");
  });
  it("uses a new link instead of a previously stored token", async () => {
    sessionStorage.setItem("document-signing-session", JSON.stringify({ token: "b".repeat(43), expiresAt: Date.now() + 300000 }));
    render(<PublicDocumentSigning />);
    await screen.findByRole("button", { name: "PATIENT" });
    expect(service.context).toHaveBeenCalledWith(token);
  });
  it("does not restore an expired stored token", () => {
    window.history.replaceState(null, "", "/firmar-documento");
    sessionStorage.setItem("document-signing-session", JSON.stringify({ token, expiresAt: Date.now() - 1 }));
    render(<PublicDocumentSigning />);
    expect(service.context).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("document-signing-session")).toBeNull();
  });

});
