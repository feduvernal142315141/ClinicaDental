"use client";

import { AlertTriangle, CheckCircle2, Clock, Coffee } from "lucide-react";
import {
  getDoctorScheduleSummary,
  type DoctorScheduleSummary as Summary,
} from "@/lib/utils/appointment-utils";
import type { WeekSchedule } from "@/lib/entity/schedule";
import type { ClinicSchedule } from "@/lib/entity/settings";

interface DoctorScheduleSummaryProps {
  schedule: WeekSchedule | Record<string, unknown> | null | undefined;
  /** True cuando ya hay un doctor seleccionado. */
  ready: boolean;
  /**
   * Horario EFECTIVO = doctor ∩ clínica: horario `rawSchedule` de la clínica
   * (parcial, tal cual `useClinicGeneralSettings()`). Si no se pasa, o aún
   * no cargó, el resumen degrada al comportamiento legacy (solo doctor).
   */
  clinicSchedule?: Partial<ClinicSchedule> | Record<string, unknown> | null;
}

/**
 * Resumen de la disponibilidad EFECTIVA del doctor: días que atiende (doctor ∩
 * clínica), rango horario representativo y descanso. Da contexto inmediato
 * antes de elegir fecha y hora.
 */
export function DoctorScheduleSummary({
  schedule,
  ready,
  clinicSchedule,
}: DoctorScheduleSummaryProps) {
  if (!ready) {
    return (
      <p className="text-sm text-subtle">
        Selecciona un doctor para ver su disponibilidad.
      </p>
    );
  }

  const summary: Summary | null = getDoctorScheduleSummary(
    schedule,
    clinicSchedule,
  );

  if (!summary || summary.workingDays.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Este doctor no tiene días de atención configurados. Edítalo en
          Configuración › Doctores.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" /> Atiende
      </span>
      <div className="flex flex-wrap gap-1">
        {summary.workingDays.map((day) => (
          <span
            key={day.key}
            className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300"
          >
            {day.short}
          </span>
        ))}
      </div>
      {summary.range && (
        <span className="inline-flex items-center gap-1.5 text-subtle">
          <Clock className="h-4 w-4" />
          <span className="tabular-nums">
            {summary.range.start}–{summary.range.end}
          </span>
        </span>
      )}
      {summary.break && (
        <span className="inline-flex items-center gap-1.5 text-subtle">
          <Coffee className="h-4 w-4" />
          <span className="tabular-nums">
            Descanso {summary.break.start}–{summary.break.end}
          </span>
        </span>
      )}
    </div>
  );
}
