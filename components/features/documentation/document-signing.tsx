"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { PatientDocument, SignatureInput } from "@/lib/entity/documentation";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import { useDocumentationAction } from "@/lib/hooks/use-documentation";
import { useI18n } from "@/lib/contexts/i18n-context";
import { SignaturePad } from "./signature-pad";
import { PdfPreview } from "./pdf-preview";

export function DocumentSigning({ document, initialPdf, onSigned, onClose }: { document: PatientDocument; initialPdf: Blob; onSigned: (document: PatientDocument) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { busy, error, run } = useDocumentationAction();
  const [method, setMethod] = useState<SignatureInput["method"]>("DRAWN");
  const [signature, setSignature] = useState<string>();
  const [specialistSignature, setSpecialistSignature] = useState<string>();
  const needsSpecialist = document.signatureRoles?.includes("SPECIALIST") ?? false;
  const [accepted, setAccepted] = useState(false);
  const [preview, setPreview] = useState<Blob | null>(initialPdf);
  const [previewInput, setPreviewInput] = useState<SignatureInput | null>(null);
  const invalidate = () => setPreviewInput(null);
  const canPreview = accepted && (method === "CHECKBOX" || !!signature) && (!needsSpecialist || !!specialistSignature);
  return <section className="space-y-4 rounded-2xl border border-hairline bg-elevated p-4 sm:p-6">
    <h2 className="text-xl font-semibold">{document.title}</h2>
    <p>{document.patientName} · {t("documentation.version")} {document.templateVersion}</p>
    <fieldset disabled={busy} className="space-y-4">
      <Button type="button" variant="outline" onClick={() => setPreview(initialPdf)}>{t("documentation.readDocument")}</Button>
      <legend className="sr-only">{t("documentation.method")}</legend>
      <h3 className="font-semibold">{t("documentation.patientSignature")}</h3>
      <div className="flex flex-wrap gap-4">
        {(["DRAWN", "CHECKBOX"] as const).map(value => <label key={value} className="flex items-center gap-2"><input type="radio" name="signature-method" checked={method === value} onChange={() => {
          setMethod(value); setSignature(undefined); setAccepted(false); invalidate();
        }} />{t(value === "DRAWN" ? "documentation.draw" : "documentation.checkbox")}</label>)}
      </div>
      {method === "DRAWN" && <SignaturePad disabled={busy} onChange={value => { setSignature(value); invalidate(); }} />}
      <label className="flex items-start gap-3 rounded-xl border border-hairline p-4"><input className="mt-1" type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); invalidate(); }} /><span>{t("documentation.accept")}</span></label>
      {needsSpecialist && <div className="space-y-2 border-t border-hairline pt-4"><h3 className="font-semibold">{t("documentation.specialistSignature")}</h3>
        <SignaturePad label={t("documentation.specialistSignature")} disabled={busy} onChange={value => { setSpecialistSignature(value); invalidate(); }} />
      </div>}
      <p className="text-sm text-subtle">{t("documentation.signHint")}</p>
      {error && <p role="alert" className="text-rose-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!canPreview} onClick={() => void run(async () => {
          const input: SignatureInput = { method, accepted: true, documentHash: document.documentHash, ...(method === "DRAWN" ? { signatureBase64: signature } : {}), ...(needsSpecialist ? { specialistSignatureBase64: specialistSignature } : {}) };
          const pdf = await service.previewSignature(document.id, input);
          setPreviewInput(input); setPreview(pdf);
        })}>{t("documentation.previewSignature")}</Button>
        <Button type="button" loading={busy} disabled={!previewInput || !canPreview} onClick={() => void run(async () => {
          if (previewInput) onSigned(await service.sign(document.id, previewInput));
        })}>{t("documentation.confirmSign")}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>{t("documentation.close")}</Button>
      </div>
    </fieldset>
    <PdfPreview blob={preview} title={t("documentation.preview")} onClose={() => setPreview(null)} />
  </section>;
}
