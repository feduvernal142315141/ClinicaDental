"use client";

/**
 * ReadinessChecklist — indicador visual no bloqueante de completitud de la consulta.
 *
 * Muestra qué elementos recomendados están presentes/ausentes en la visita actual.
 * Es SOLO informativo; no bloquea ninguna acción ni modifica el modal de finalizar.
 */

import { CircleCheck, Circle, Info } from "lucide-react";
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

  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2 transition-colors",
        allDone
          ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800"
          : "border-hairline bg-elevated",
      )}
    >
      <div className="flex items-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-subtle" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">
          Lista para finalizar
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-semibold",
            allDone ? "text-emerald-600 dark:text-emerald-400" : "text-subtle",
          )}
        >
          {doneCount}/{items.length}
        </span>
      </div>

      <ul className="space-y-1" role="list" aria-label="Estado de completitud de la consulta">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2"
            aria-label={`${item.label}: ${item.done ? "completo" : "pendiente"}`}
          >
            {item.done ? (
              <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-subtle" />
            )}
            <span
              className={cn(
                "text-xs",
                item.done ? "text-ink" : "text-subtle",
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {!allDone && (
        <p className="text-[10px] text-subtle">
          Estos elementos son recomendados. Puedes finalizar la consulta en cualquier momento.
        </p>
      )}
    </div>
  );
}
