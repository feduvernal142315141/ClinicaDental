"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui";
import type { PatientDocument, SignatureRequestStatus } from "@/lib/entity/documentation";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import { useDocumentationAction } from "@/lib/hooks/use-documentation";
import { useI18n } from "@/lib/contexts/i18n-context";
import { signatureEvents } from "@/lib/services/documentation/signature-events";
import { SignableDocument } from "./signable-document";
import { SignaturePad } from "./signature-pad";

export function DocumentSigning({ document, onSigned, onClose, embedded = false, onWaitingChange }: { document: PatientDocument; initialPdf: Blob; embedded?: boolean; onSigned: (document: PatientDocument) => void; onClose: () => void; onWaitingChange?: (waiting: boolean) => void }) {
  const { t } = useI18n();
  const { busy, error, run } = useDocumentationAction();
  const [signedDocument, setSignedDocument] = useState<PatientDocument>();
  const acknowledged = useRef(false);
  const [capture, setCapture] = useState(false);
  const [specialistSignature, setSpecialistSignature] = useState<string>();
  const [request, setRequest] = useState<SignatureRequestStatus>();
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [statusError, setStatusError] = useState(false);
  const callback = useRef(onSigned); callback.current = onSigned;
  const finishConfirmation = useCallback(() => {
    if (!signedDocument || acknowledged.current) return;
    acknowledged.current = true;
    callback.current(signedDocument);
  }, [signedDocument]);
  useEffect(() => {
    if (!signedDocument) return;
    const timer = setTimeout(finishConfirmation, 20_000);
    return () => clearTimeout(timer);
  }, [signedDocument, finishConfirmation]);
  const needsSpecialist = document.signatureRoles?.includes("SPECIALIST") ?? false;
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let retry = 1000;
    const connect = async () => {
      try {
        await signatureEvents(document.id, controller.signal, async next => {
          if (!active) return;
          retry = 1000;
          setRequest(next); setStatusError(false);
          if (next.status === "SIGNED") {
            const signed = await service.document(document.id);
            if (active) setSignedDocument(signed);
          }
        });
      } catch {
        if (active) {
          setStatusError(true);
          timer = setTimeout(() => void connect(), retry);
          retry = Math.min(retry * 2, 15000);
        }
      }
    };
    void connect();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [document.id, revision]);
  const pending = request?.status === "SENT" || request?.status === "LINK_READY";
  useEffect(() => { if (request) onWaitingChange?.(pending || request.status === "SIGNED"); }, [request, pending, onWaitingChange]);
  useEffect(() => {
    if (!pending) return;
    // Keep application keyboard shortcuts from navigating behind the blocking dialog.
    const blockShortcuts = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "F5" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r")) return;
      event.stopImmediatePropagation();
      if (event.key === "Escape" || event.ctrlKey || event.metaKey || event.altKey) event.preventDefault();
    };
    window.addEventListener("keydown", blockShortcuts, true);
    return () => window.removeEventListener("keydown", blockShortcuts, true);
  }, [pending]);
  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  const remaining = Math.max(0, Math.ceil((Date.parse(request?.expiresAt ?? "") - now) / 1000)) || 0;
  const refresh = () => setRevision(value => value + 1);
  const send = () => void run(async () => {
    if (!request || pending || request.status === "SIGNED" || (needsSpecialist && !specialistSignature)) return;
    const next = await service.requestSignature(document.id, { documentHash: document.documentHash, ...(needsSpecialist ? { specialistSignatureBase64: specialistSignature } : {}) });
    setRequest(next); setCapture(false); setNow(Date.now()); setRevision(value => value + 1);
  });
  if (signedDocument) return <section className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 p-6 text-center">
    <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-700">✓</span>
    <div role="status" className="space-y-3">
      <h2 className="text-2xl font-semibold">{t("documentation.remoteReceived")}</h2>
      <p>{t("documentation.remoteReceivedHint")}</p>
      <p className="text-sm text-subtle">{t("documentation.remoteReceivedTimeout")}</p>
    </div>
    <Button onClick={finishConfirmation}>{t("documentation.remoteContinue")}</Button>
  </section>;
  return <section className={embedded ? "space-y-3" : "space-y-4"}>
    {!embedded && <h2 className="text-xl font-semibold">{document.title}</h2>}
    {!pending && <p className="text-sm text-subtle">{t("documentation.remoteStaffHint")}</p>}
    {pending ? <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 rounded-xl border border-hairline p-6 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-primary" aria-hidden="true" />
      <h3 className="text-lg font-semibold">{t("documentation.remoteWaiting")}</h3>
      <p className="text-sm text-subtle">{t("documentation.remoteWaitingHint")}</p>
      <p className="text-3xl font-semibold tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
      {remaining === 0 && <p role="status">{t("documentation.remoteChecking")}</p>}
    </div> : <SignableDocument document={document} disabled={busy || !request || pending || request.status === "SIGNED"} allowedRoles={["SPECIALIST"]} signatures={{ SPECIALIST: specialistSignature }} onSign={role => { if (role === "SPECIALIST") setCapture(true); }} />}
    <Dialog open={capture} onOpenChange={setCapture}>
      <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{t("documentation.specialistSignature")}</DialogTitle><DialogDescription>{t("documentation.drawHint")}</DialogDescription></DialogHeader>
        {error && <p role="alert">{error}</p>}
        <SignaturePad label={t("documentation.specialistSignature")} disabled={busy} onChange={setSpecialistSignature} />
        <Button disabled={!specialistSignature || busy} loading={busy} onClick={send}>{t("documentation.remoteSignAndSend") || t("documentation.useSignature")}</Button>
      </DialogContent>
    </Dialog>
    {pending && <p role="status">{t(request.status === "LINK_READY" ? "documentation.remoteLocalLink" : "documentation.remoteSent")} {request.status === "SENT" ? request.phoneMasked : ""} · {request.expiresAt && new Date(request.expiresAt).toLocaleTimeString()}</p>}
    {request?.status === "EXPIRED" && <p role="status">{t("documentation.remoteExpiredStaff")}</p>}
    {(error || statusError) && <p role="alert">{error || t("documentation.error")}</p>}
    <div className="flex flex-wrap gap-2">
      {!pending && <Button loading={busy} disabled={!request || request.status === "SIGNED" || (needsSpecialist && !specialistSignature)} onClick={send}>{t("documentation.remoteSend")}</Button>}
      {!pending && <><Button variant="outline" disabled={busy} onClick={refresh}>{t("documentation.remoteRefresh")}</Button>
      <Button variant="ghost" onClick={onClose}>{t("documentation.close")}</Button></>}
    </div>
  </section>;
}
