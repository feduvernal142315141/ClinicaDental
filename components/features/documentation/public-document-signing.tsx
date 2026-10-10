"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui";
import type { PatientSignatureInput, PublicSigningContext } from "@/lib/entity/documentation";
import { publicSigningService as service, PublicSigningError } from "@/lib/services/documentation/public-signing.service";
import { useI18n } from "@/lib/contexts/i18n-context";
import { SignableDocument } from "./signable-document";
import { SignaturePad } from "./signature-pad";

const SESSION_KEY = "document-signing-session";
function saveSigningSession(token: string, expiresAt: number) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt })); } catch { /* Storage may be disabled; signing remains available in memory. */ }
}
function restoreSigningSession(): string | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    if (typeof stored?.token === "string" && typeof stored.expiresAt === "number" && stored.expiresAt > Date.now()) return stored.token;
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Ignore unavailable or malformed storage. */ }
  return null;
}

export function PublicDocumentSigning() {
  const { t } = useI18n();
  const token = useRef<string | null>(null);
  const clearToken = useCallback(() => {
    token.current = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ }
  }, []);
  const [context, setContext] = useState<PublicSigningContext>();
  const [unavailable, setUnavailable] = useState(false);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(false);
  const [capture, setCapture] = useState(false);
  const [method, setMethod] = useState<"DRAWN" | "CHECKBOX">("DRAWN");
  const [signature, setSignature] = useState<string>();
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    // A fresh link takes precedence; session storage preserves it on reload in this clinic's tab.
    const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (fragmentToken !== null) {
      clearToken();
      token.current = fragmentToken;
      if (/^[A-Za-z0-9_-]{32,256}$/.test(fragmentToken)) saveSigningSession(fragmentToken, Date.now() + 300_000);
    } else if (!token.current) token.current = restoreSigningSession();
    window.history.replaceState(null, "", window.location.pathname);
    if (!token.current || !/^[A-Za-z0-9_-]{32,256}$/.test(token.current)) { clearToken(); setUnavailable(true); return; }
    let active = true;
    void service.context(token.current).then(data => {
      if (active) { setContext(data); if (token.current) saveSigningSession(token.current, Date.parse(data.expiresAt)); }
    }).catch(cause => { if (active) { if (cause instanceof PublicSigningError && [401,403,404,409,410].includes(cause.status)) { clearToken(); setUnavailable(true); } else setError(true); } });
    return () => { active = false; };
  }, [clearToken]);
  useEffect(() => {
    if (!context || signed) return;
    const delay = Date.parse(context.expiresAt) - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) { setUnavailable(true); clearToken(); return; }
    const timer = setTimeout(() => { setUnavailable(true); setContext(undefined); setSignature(undefined); clearToken(); }, delay);
    return () => clearTimeout(timer);
  }, [context, signed, clearToken]);
  const loadPage = useCallback((page: number) => service.page(token.current ?? "", page), []);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try { await action(); }
    catch (cause) { if (cause instanceof PublicSigningError && [401,403,404,409,410].includes(cause.status)) { setUnavailable(true); clearToken(); } else setError(true); }
    finally { lock.current = false; setBusy(false); }
  };
  const ready = accepted && (method === "CHECKBOX" || !!signature);
  return <main className="mx-auto h-dvh max-w-6xl space-y-4 overflow-y-auto overscroll-y-contain bg-canvas p-3 sm:p-6">
    <h1 className="text-xl font-semibold">{signed ? t("documentation.remoteSigned") : t("documentation.remoteTitle")}</h1>
    {signed ? <p role="status">{t("documentation.remoteDone")}</p> : unavailable ? <p role="alert">{t("documentation.remoteUnavailable")}</p> : !context ? <><p role={error ? "alert" : "status"}>{t(error ? "documentation.error" : "consultationDocuments.loading")}</p>{error && <Button disabled={busy} onClick={() => void run(async () => setContext(await service.context(token.current ?? "")))}>{t("consultationDocuments.retry")}</Button>}</> : <>
      <p>{context.title} · {context.patientName}</p>
      <p className="text-sm text-subtle">{t("documentation.remotePatientHint")}</p>
      <SignableDocument document={context} loadPage={loadPage} allowedRoles={["PATIENT"]} disabled={busy} signatures={{ PATIENT: method === "DRAWN" ? signature : undefined }} patientAccepted={method === "CHECKBOX" && accepted} patientView onSign={role => { if (role === "PATIENT") setCapture(true); }} />
      <Dialog open={capture} onOpenChange={setCapture}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{t("documentation.patientSignature")}</DialogTitle><DialogDescription>{t("documentation.drawHint")}</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-4">{(["DRAWN", "CHECKBOX"] as const).map(value => <label key={value} className="flex gap-2"><input type="radio" name="patient-method" checked={method === value} onChange={() => { setMethod(value); setSignature(undefined); setAccepted(false); }} />{t(value === "DRAWN" ? "documentation.draw" : "documentation.checkbox")}</label>)}</div>
        {method === "DRAWN" ? <SignaturePad disabled={busy} onChange={value => { setSignature(value); }} /> : <label className="flex items-center gap-3"><input className="m-0 h-4 w-4 shrink-0" type="checkbox" checked={accepted} onChange={event => { setAccepted(event.target.checked); }} /><span className="leading-6">{t("documentation.accept")}</span></label>}
        <Button disabled={busy || (method === "DRAWN" ? !signature : !accepted)} onClick={() => setCapture(false)}>{t("documentation.useSignature")}</Button>
      </DialogContent></Dialog>
      <label className="flex items-center gap-3 rounded-xl border border-hairline p-4"><input className="m-0 h-4 w-4 shrink-0" type="checkbox" disabled={busy} checked={accepted} onChange={event => { setAccepted(event.target.checked); }} /><span className="leading-6">{t("documentation.accept")}</span></label>
      {error && <p role="alert">{t("documentation.error")}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ready || busy} loading={busy} onClick={() => void run(async () => {
          if (!ready) return;
          const input: PatientSignatureInput = { method, accepted: true, documentHash: context.documentHash, ...(method === "DRAWN" ? { signatureBase64: signature } : {}) };
          await service.sign(token.current ?? "", input); clearToken(); setSigned(true); setContext(undefined); setSignature(undefined);
        })}>{t("documentation.confirmSign")}</Button>
      </div>
    </>}
  </main>;
}
