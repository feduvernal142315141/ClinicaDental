"use client";

import { useCallback, useId, useState } from "react";
import { Loader2, Lock, Mic, Paperclip } from "lucide-react";

import { Switch } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { draftToHtml, type ComposerMode } from "./use-evolution-composer";

/** Objetivo táctil de 44px en pantallas de dedo (WCAG 2.2 — 2.5.8). */
const COARSE_TOUCH = "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";

/** Botón icono fantasma del pie: 36px con ratón, 44px con dedo. */
const ICON_BUTTON_CLASS = cn(
  "grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors",
  "hover:bg-hover hover:text-ink",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-subtle",
  COARSE_TOUCH,
);

export interface EvolutionComposerProps {
  mode: ComposerMode;
  /** Borrador en TEXTO PLANO (el compositor no edita HTML). */
  value: string;
  onChange: (value: string) => void;
  /**
   * Guarda la nota de la visita en curso. Recibe el HTML ya escapado, listo
   * para `clinicalNotes`. Solo se invoca en `mode.kind === "ready"`.
   */
  onSave: (html: string) => Promise<void>;
  /**
   * Abre una consulta para poder registrar la evolución. El borrador NO se
   * envía aquí: se conserva hasta que el host vuelve con la consulta abierta.
   */
  onRequestConsultation: () => void;
  saving?: boolean;
  soapEnabled: boolean;
  onSoapToggle: (enabled: boolean) => void;
  onAttach?: () => void;
  onDictate?: () => void;
  /** Contra qué registro se escribe. Lo compone `useEvolutionComposer`. */
  contextLabel: string;
  className?: string;
}

/**
 * Compositor "Escribir evolución de hoy…" — la caja SIEMPRE visible en lo alto
 * de la columna de evolución.
 *
 * Regla dura de este componente: **no guarda a ciegas**. El backend solo acepta
 * la nota de una visita ya iniciada (`PATCH …/visits/{appointmentId}/notes`
 * responde 404 sin fila y 409 si la visita está cerrada) y SOBREESCRIBE lo que
 * hubiera. Por eso el estado de "no hay consulta" no es un error tardío sino un
 * modo: el textarea sigue escribible y el botón cambia de significado.
 *
 * Nunca escribe en `PATCH /clinical-history/patients/{id}/notes` como plan B —
 * ese es OTRO registro, sin fecha y de reemplazo total: usarlo perdería la nota
 * permanente del paciente sin decírselo a nadie.
 *
 * Sin scroll propio (ADR-36): crece con su contenido dentro del scroller de la
 * vista.
 */
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
  contextLabel,
  className,
}: EvolutionComposerProps) {
  const soapId = useId();
  const textareaId = useId();

  // Reentrada: el `saving` del host puede tardar un render en llegar y el
  // endpoint SOBREESCRIBE, así que dos envíos seguidos no son inocuos.
  const [submitting, setSubmitting] = useState(false);
  const busy = saving || submitting;

  const isEmpty = value.trim().length === 0;

  const handleSubmit = useCallback(async () => {
    if (busy || isEmpty) return;

    if (mode.kind === "needs-consultation") {
      // El texto se queda donde está: lo guarda el hook, no este componente.
      onRequestConsultation();
      return;
    }

    if (mode.kind !== "ready") return;

    setSubmitting(true);
    try {
      await onSave(draftToHtml(value));
    } catch {
      // El host es quien notifica el fallo (`notifyApiError`); aquí solo se
      // suelta el botón para que se pueda reintentar sin recargar.
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
  const needsConsultation = mode.kind === "needs-consultation";
  // El verbo del botón dice lo que va a PASAR. Sin consulta abierta, "Guardar"
  // sería mentira: no hay registro contra el que escribir hasta que se inicie.
  const saveLabel = needsConsultation
    ? "Guardar e iniciar consulta"
    : "Guardar";
  const busyLabel = needsConsultation ? "Iniciando consulta…" : "Guardando…";

  return (
    <section
      className={cn("bento overflow-hidden", className)}
      aria-busy={isLoading || undefined}
    >
      {/* ── Cabecera ───────────────────────────────────────────────────── */}
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
            // El rótulo tiene que decir que esto NO cambia lo que se guarda: el
            // backend almacena `clinicalNotes` como UN string, sin bloques SOAP.
            aria-label="Estructurar el dictado como SOAP"
            title="Solo afecta al dictado: pide a la IA que estructure el audio en subjetivo, objetivo, apreciación y plan. La nota se guarda como un único texto."
          />
        </div>
      </div>

      {/* ── Cuerpo ─────────────────────────────────────────────────────── */}
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
          aria-describedby={`${textareaId}-context`}
        />
      )}

      {/* Contra QUÉ se escribe. Va siempre, también mientras se comprueba: la
          duda sobre el destino del texto no puede quedar sin decir. */}
      <p
        id={`${textareaId}-context`}
        className="px-4 pb-2.5 text-[11px] text-subtle"
      >
        {contextLabel}
      </p>

      {/* ── Pie ────────────────────────────────────────────────────────── */}
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
            "inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-1.5",
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
