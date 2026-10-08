"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/contexts/i18n-context";
import { DOCUMENT_VARIABLES } from "@/lib/entity/documentation/variables";
import { Button } from "@/components/ui";

/** Edits plain text in-place; variable insertion stays in the current local draft. */
export function DocumentVariableText({ value, onChange, label, disabled, textareaClassName, autoFocus = false, toolbarTarget }: {
  value: string; onChange: (value: string) => void; label: string; disabled?: boolean; textareaClassName: string; autoFocus?: boolean; toolbarTarget?: HTMLElement | null;
}) {
  const { t } = useI18n();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [variable, setVariable] = useState<string>(DOCUMENT_VARIABLES[0].key);
  const [dateSource, setDateSource] = useState("actual");
  const insert = () => {
    const scrollTop = textarea.current?.scrollTop ?? 0;
    const scrollLeft = textarea.current?.scrollLeft ?? 0;
    const start = textarea.current?.selectionStart ?? value.length;
    const end = textarea.current?.selectionEnd ?? start;
    const token = `{{${variable === "fecha_documento" ? `${variable}:${dateSource}` : variable}}}`;
    if (value.length - (end - start) + token.length > 100000) return;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      const field = textarea.current;
      if (!field) return;
      field.setSelectionRange(start + token.length, start + token.length);
      field.focus({ preventScroll: true });
      // Controlled text updates may scroll to the end; keep the current editing viewport.
      field.scrollTop = scrollTop;
      field.scrollLeft = scrollLeft;
    });
  };
  const controls = <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-elevated p-2 text-ink">
      <label className="min-w-0 basis-full sm:basis-0 sm:flex-1"><span className="sr-only">{t("documentation.variable")}</span><select aria-label={t("documentation.variable")} disabled={disabled} value={variable} onChange={event => setVariable(event.target.value)} className="w-full rounded-lg border border-hairline bg-elevated p-1 text-sm">
        {(["patient", "doctor", "otherVariables"] as const).map(group => <optgroup key={group} label={t(`documentation.${group}`)}>{DOCUMENT_VARIABLES.filter(item => item.group === group).map(item => <option key={item.key} value={item.key}>{t(`documentation.${item.label}`)}</option>)}</optgroup>)}
      </select></label>
      {variable === "fecha_documento" && <label className="space-y-1 text-xs"><span>{t("documentation.dateSource")}</span><select aria-label={t("documentation.dateSource")} disabled={disabled} value={dateSource} onChange={event => setDateSource(event.target.value)} className="block rounded-lg border border-hairline bg-elevated p-1 text-sm">
        <option value="actual">{t("documentation.dateAtGeneration")}</option><option value="seleccionada">{t("documentation.dateSelectedAtGeneration")}</option>
      </select></label>}
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={insert}>{t("documentation.insertVariable")}</Button>
    </div>;
  return <div className="flex min-h-0 flex-1 flex-col">
    {toolbarTarget ? createPortal(controls, toolbarTarget) : controls}
    <textarea ref={textarea} autoFocus={autoFocus} aria-label={label} maxLength={100000} disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className={textareaClassName} />
  </div>;
}
