"use client";

import { useCallback, useId, useState } from "react";
import { Loader2, Lock, Mic, Paperclip } from "lucide-react";

import { Switch } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { draftToHtml, type ComposerMode } from "./use-evolution-composer";

const COARSE_TOUCH = "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";

const ICON_BUTTON_CLASS = cn(
  "grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors",
  "hover:bg-hover hover:text-ink",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-subtle",
  COARSE_TOUCH,
);

export interface EvolutionComposerProps {
  mode: ComposerMode;
  value: string;
  onChange: (value: string) => void;
  onSave: (html: string) => Promise<void>;
  onRequestConsultation: () => void;
  saving?: boolean;
  soapEnabled: boolean;
  onSoapToggle: (enabled: boolean) => void;
  onAttach?: () => void;
  onDictate?: () => void;
  className?: string;
}
export function EvolutionComposer({
  mode,
  value,
  onChange,
  onSave,
  onRequestConsultation,
  saving = false,
  soapEnabled,
  onSoapToggle,
  onAttach,
  onDictate,
  className,
}: EvolutionComposerProps) {
  const soapId = useId();
  const textareaId = useId();
  const [submitting, setSubmitting] = useState(false);
  const busy = saving || submitting;
  const isEmpty = value.trim().length === 0;
  const handleSubmit = useCallback(async () => {
    if (busy || isEmpty) return;
    if (mode.kind === "needs-consultation") {
      onRequestConsultation();
      return;
    }
    if (mode.kind !== "ready") return;
    setSubmitting(true);
    try {
      await onSave(draftToHtml(value));
    } catch {
    } finally {
      setSubmitting(false);
    }
  }, [busy, isEmpty, mode, onRequestConsultation, onSave, value]);

  if (mode.kind === "read-only") {
    return (
      <section className={cn("bento overflow-hidden p-4", className)}>
        <div className="flex items-start gap-2.5">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              Evolución clínica
            </h2>
            <p className="mt-1 text-xs text-subtle">
              Tu rol no permite escribir en la historia clínica. Puedes leer las
              consultas registradas más abajo.
            </p>
          </div>
        </div>
      </section>
    );
  }
  const isLoading = mode.kind === "loading";

  const saveLabel = "Guardar";
  const busyLabel = "Guardando…";
  return (
    <section
      className={cn("bento overflow-hidden", className)}
      aria-busy={isLoading || undefined}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <h2 className="text-sm font-semibold text-ink">
          Escribir evolución de hoy…
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor={soapId} className="text-xs text-subtle">
            IA (SOAP)
          </label>
          <Switch
            id={soapId}
            checked={soapEnabled}
            onCheckedChange={onSoapToggle}
            disabled={isLoading}
            aria-label="Estructurar el dictado como SOAP"
            title="Solo afecta al dictado: pide a la IA que estructure el audio en subjetivo, objetivo, apreciación y plan. La nota se guarda como un único texto."
          />
        </div>
      </div>
      {isLoading ? (
        <div className="px-4 py-4" aria-hidden="true">
          <div className="h-3 w-2/3 animate-pulse rounded bg-hover" />
          <div className="mt-2.5 h-3 w-1/2 animate-pulse rounded bg-hover" />
          <div className="mt-2.5 h-3 w-3/4 animate-pulse rounded bg-hover" />
        </div>
      ) : (
        <textarea
          id={textareaId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Redacta la nota clínica…"
          rows={5}
          className={cn(
            "min-h-28 w-full resize-none bg-transparent px-4 py-3",
            "text-sm leading-relaxed text-ink placeholder:text-subtle",
            "outline-none focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30",
          )}
          />
      )}
      <div className="flex items-center justify-between gap-3 border-t border-hairline px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAttach}
            disabled={!onAttach || isLoading}
            className={ICON_BUTTON_CLASS}
            aria-label="Adjuntar archivo"
            title="Adjuntar archivo"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDictate}
            disabled={!onDictate || isLoading}
            className={ICON_BUTTON_CLASS}
            aria-label="Dictar evolución"
            title="Dictar evolución"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isLoading || busy || isEmpty}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2",
            "text-sm font-medium text-white transition-colors hover:bg-brand-strong",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand",
            "[@media(pointer:coarse)]:min-h-11",
          )}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? busyLabel : saveLabel}
        </button>
      </div>
    </section>
  );
}
export default EvolutionComposer;
