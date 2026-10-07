"use client";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useI18n } from "@/lib/contexts/i18n-context";

export function DocumentUpload({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return <div className="grid min-w-0 gap-1">
    <span className="block text-xs font-medium leading-4">{t("documentation.import")}</span>
    <button type="button" disabled={disabled} aria-label={t("documentation.import")}
      className={`flex h-10 min-h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${over ? "border-brand bg-brand/10" : "border-hairline bg-surface hover:border-brand"}`}
      onClick={() => input.current?.click()}
      onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); if (!disabled) setOver(true); } }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false); }}
      onDrop={event => {
        event.preventDefault(); setOver(false);
        if (!disabled && event.dataTransfer.files.length) onFiles(Array.from(event.dataTransfer.files));
      }}>
      <UploadCloud aria-hidden="true" className="shrink-0 text-brand" size={18} />
      <span className="min-w-0 text-xs leading-snug">{t(disabled ? "documentation.loading" : "documentation.dropFile")}</span>
    </button>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={t("documentation.import")} disabled={disabled}
      accept=".doc,.docx,.pdf,.png,.jpg,.jpeg" onChange={event => {
        const files = Array.from(event.target.files ?? []); event.target.value = "";
        if (!disabled && files.length) onFiles(files);
      }} />
  </div>;
}
