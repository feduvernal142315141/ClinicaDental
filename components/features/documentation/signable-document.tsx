"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, PenLine } from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/contexts/i18n-context";
import { documentationService } from "@/lib/services/documentation/documentation.service";
import type { DocumentSigningPage, PatientDocument, SignerRole } from "@/lib/entity/documentation";

export function SignableDocument({ document, disabled, signatures = {}, patientAccepted = false, allowedRoles, loadPage, patientView = false, onSign }: {
  document: Pick<PatientDocument, "id" | "title" | "documentHash">; allowedRoles?: SignerRole[]; loadPage?: (page: number) => Promise<DocumentSigningPage>; disabled: boolean; signatures?: Partial<Record<SignerRole, string>>; patientAccepted?: boolean; patientView?: boolean; onSign: (role: SignerRole) => void;
}) {
  const { t } = useI18n();
  const [retry, setRetry] = useState(0);
  const [pages, setPages] = useState<DocumentSigningPage[]>([]);
  const [failed, setFailed] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string>();
  const fieldRefs = useRef(new Map<string, HTMLButtonElement>());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    let active = true;
    setPages([]); setFailed(false);
    const load = async () => {
      let pageCount = 1;
      for (let page = 0; page < pageCount; page++) {
        const result = await (loadPage ? loadPage(page) : documentationService.signingPage(document.id, page));
        if (!active) return;
        if (result.documentHash !== document.documentHash || result.page !== page || result.pageCount < 1 || result.pageCount > 100) {
          setPages([]); setFailed(true); return;
        }
        pageCount = result.pageCount;
        setPages(previous => [...previous, result]);
      }
    };
    void load().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [document.id, document.documentHash, retry, loadPage]);
  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);
  const visibleFields = (data: DocumentSigningPage) => data.fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => !allowedRoles || allowedRoles.includes(field.signerRole));
  const pendingField = pages.flatMap(data => visibleFields(data).map(({ field, index }) => ({ data, field, index })))
    .find(({ field }) => !signatures[field.signerRole]
      && !(field.signerRole === "PATIENT" && patientAccepted));
  const pendingFieldKey = pendingField ? `${pendingField.data.page}:${pendingField.index}` : undefined;
  const scrollToField = (field: HTMLButtonElement) => {
    let parent = field.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
        const fieldRect = field.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const top = parent.scrollTop + fieldRect.top - parentRect.top - (parent.clientHeight - fieldRect.height) / 2;
        parent.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        return;
      }
      parent = parent.parentElement;
    }
    field.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  };
  const jumpToSignature = () => {
    if (!pendingFieldKey) return;
    const field = fieldRefs.current.get(pendingFieldKey);
    if (!field) return;
    setHighlightedField(pendingFieldKey);
    scrollToField(field);
    field.focus({ preventScroll: true });
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedField(current => current === pendingFieldKey ? undefined : current), 1800);
  };
  return <div className="space-y-3">
    <p className="text-sm text-subtle">{t("documentation.clickSignatureHint")}</p>
    {failed ? <div role="alert" className="space-y-2"><p>{t("documentation.error")}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>{t("consultationDocuments.retry")}</Button></div> : !pages.length ? <p role="status">{t("consultationDocuments.loading")}</p> : <>
      {pendingFieldKey && <div className={`relative mx-auto mb-3 flex w-fit flex-col items-start gap-2 sm:fixed sm:top-1/3 sm:z-40 ${patientView ? "sm:left-[clamp(1rem,12vw,14rem)]" : "sm:left-6"}`}>
        <span className="rounded-md bg-elevated/95 px-3 py-1.5 text-xs text-subtle shadow-lg backdrop-blur">{t("documentation.pendingSignature")}</span>
        <Button className="gap-2 shadow-xl" disabled={disabled} onClick={jumpToSignature}>
          <PenLine className="h-4 w-4" aria-hidden="true" />{t("documentation.goToSignature")}
        </Button>
      </div>}
      <div className="space-y-6 bg-canvas p-1 sm:p-2">
      {pages.map(data => <div key={data.page}>
        <div className="relative mx-auto w-full max-w-5xl bg-white" style={{ aspectRatio: `${data.width} / ${data.height}` }}>
          {/* The image is the stored PDF page, not a reconstruction of the template. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageDataUrl} alt={`${document.title} — ${data.page + 1}`} className="block h-full w-full" />
          {visibleFields(data).map(({ field, index }) => {
            const signature = signatures[field.signerRole];
            const checked = field.signerRole === "PATIENT" && patientAccepted;
            const completed = !!signature || checked;
            const label = t(field.signerRole === "SPECIALIST" ? "documentation.specialistSignature" : "documentation.patientSignature");
            const fieldKey = `${data.page}:${index}`;
            return <button key={fieldKey} ref={element => { if (element) fieldRefs.current.set(fieldKey, element); else fieldRefs.current.delete(fieldKey); }} type="button" disabled={disabled} onClick={() => onSign(field.signerRole)}
              aria-label={`${label} — ${t(completed ? "documentation.signatureCaptured" : "documentation.clickToSign")}`}
              className={`group absolute text-left transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait ${highlightedField === fieldKey ? "z-10 rounded-md ring-4 ring-amber-300/70 ring-offset-4" : ""}`}
              style={{ left: `${field.x / data.width * 100}%`, top: `${field.top / data.height * 100}%`, width: `${field.width / data.width * 100}%`, height: `${field.height / data.height * 100}%` }}>
              <span className="absolute inset-x-[4%] top-[20%] bottom-[12%] flex flex-col items-start justify-center">
                {signature ? <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signature} alt={label} className="max-h-[80%] max-w-full object-contain object-left" />
                </> : checked ? <span className="flex items-center gap-2 text-sm font-medium text-slate-900"><Check className="h-5 w-5 shrink-0" aria-hidden="true" />{t("documentation.acceptanceVisible")}</span> :
                  <span className="inline-flex min-h-11 flex-col items-center justify-center rounded-sm border border-amber-400 bg-amber-200 px-4 py-1 text-xs font-semibold text-slate-950 shadow-sm transition-colors group-hover:bg-amber-300">
                    {t("documentation.signHere")}<ArrowDownToLine className="h-5 w-5" aria-hidden="true" />
                  </span>}
                <span className="mt-1 w-full border-b border-slate-400" aria-hidden="true" />
              </span>
            </button>;
          })}
        </div>
        <p className="mt-2 text-center text-xs text-subtle">{data.page + 1} / {data.pageCount}</p>
      </div>)}
      </div>
      {pages.length < pages[0].pageCount && <p role="status">{t("consultationDocuments.loading")}</p>}
    </>}
  </div>;
}
