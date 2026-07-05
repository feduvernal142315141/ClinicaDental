"use client";

/**
 * ReadinessChecklist — indicador visual no bloqueante de completitud de la consulta.
 *
 * Muestra qué elementos recomendados están presentes/ausentes en la visita actual.
 * Es SOLO informativo; no bloquea ninguna acción ni modifica el modal de finalizar.
 */

import { CircleCheck, Circle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { VisitDiagnosis, ExamFindings } from "@/lib/entity/clinical-history";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReadinessChecklistProps {
  diagnoses: VisitDiagnosis[];
  examFindings: ExamFindings | null;
  hasNotes: boolean;
  chiefComplaint?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReadinessChecklist({
  diagnoses,
  examFindings,
  hasNotes,
  chiefComplaint,
}: ReadinessChecklistProps) {
  const hasExtraoral = Object.values(examFindings?.extraoral ?? {}).some(
    (v) => typeof v === "string" && v.trim(),
  );
  const hasIntraoral = Object.values(examFindings?.intraoral ?? {}).some(
    (v) => typeof v === "string" && v.trim(),
  );

  const items: Array<{ label: string; done: boolean }> = [
    {
      label: "Motivo de consulta",
      done: Boolean(chiefComplaint?.trim()),
    },
    {
      label: `Diagnóstico CIE-10${diagnoses.length > 0 ? ` (${diagnoses.length})` : ""}`,
      done: diagnoses.length > 0,
    },
    {
      label: "Hallazgos extraorales",
      done: hasExtraoral,
    },
    {
      label: "Hallazgos intraorales",
      done: hasIntraoral,
    },
    {
      label: "Notas clínicas",
      done: hasNotes,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm transition-colors",
        allDone
          ? "border-emerald-400/25 bg-emerald-500/10"
          : "border-hairline bg-surface",
      )}
    >
      {/* Header — mismo lenguaje que las demás secciones */}
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
            allDone
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-brand/10 text-brand",
          )}
        >
          {allDone ? (
            <CircleCheck className="h-4 w-4" />
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}
        </span>
        <h3 className="text-sm font-semibold text-ink">Lista para finalizar</h3>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            allDone
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-hover text-subtle",
          )}
        >
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mb-3.5 h-1.5 w-full overflow-hidden rounded-full bg-hover">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            allDone ? "bg-emerald-500" : "bg-brand",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul
        className="space-y-1.5"
        role="list"
        aria-label="Estado de completitud de la consulta"
      >
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2"
            aria-label={`${item.label}: ${item.done ? "completo" : "pendiente"}`}
          >
            {item.done ? (
              <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-subtle" />
            )}
            <span
              className={cn("text-sm", item.done ? "text-ink" : "text-subtle")}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {!allDone && (
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          Estos elementos son recomendados. Puedes finalizar la consulta en
          cualquier momento.
        </p>
      )}
    </div>
  );
}
