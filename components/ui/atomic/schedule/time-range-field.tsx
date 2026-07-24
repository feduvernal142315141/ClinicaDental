import type { ReactNode } from "react";

import { ScheduleTimeField } from "@/components/ui/atomic/schedule/schedule-time-field";

/** Props de un slot (inicio o fin) de `TimeRangeField`. */
export interface TimeRangeFieldSlot {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  errorMessage?: string;
}

export interface TimeRangeFieldProps {
  /** Encabezado del grupo (p.ej. "Horario de Consulta", "Descanso Intermedio"). */
  heading?: string;
  /** Ícono opcional antes del encabezado. */
  icon?: ReactNode;
  /** Etiqueta flotante del slot inicial (p.ej. "Desde", "Inicio"). */
  startLabel?: string;
  /** Etiqueta flotante del slot final (p.ej. "Hasta", "Fin"). */
  endLabel?: string;
  start: TimeRangeFieldSlot;
  end: TimeRangeFieldSlot;
  /** Acota ambos slots (paridad con `lib/utils/schedule-bounds.ts`). */
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
}

/**
 * TimeRangeField — grupo de un rango horario (variante ClinicPro): un
 * encabezado ("Horario de Consulta" / "Descanso Intermedio") sobre dos campos
 * de hora con etiqueta flotante ("Desde"/"Hasta", "Inicio"/"Fin") dispuestos
 * lado a lado. Misma gramática para clínica y doctor, sin duplicar layout.
 */
export function TimeRangeField({
  heading,
  icon,
  startLabel,
  endLabel,
  start,
  end,
  minTime,
  maxTime,
  disabled,
}: TimeRangeFieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      {heading && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-subtle">
          {icon}
          {heading}
        </div>
      )}
      <div className="flex items-start gap-3">
        <ScheduleTimeField
          label={startLabel}
          value={start.value}
          onChange={start.onChange}
          onBlur={start.onBlur}
          id={start.id}
          ariaLabel={start.ariaLabel}
          ariaInvalid={start.ariaInvalid}
          errorMessage={start.errorMessage}
          minTime={minTime}
          maxTime={maxTime}
          disabled={disabled}
        />
        <ScheduleTimeField
          label={endLabel}
          value={end.value}
          onChange={end.onChange}
          onBlur={end.onBlur}
          id={end.id}
          ariaLabel={end.ariaLabel}
          ariaInvalid={end.ariaInvalid}
          errorMessage={end.errorMessage}
          minTime={minTime}
          maxTime={maxTime}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
