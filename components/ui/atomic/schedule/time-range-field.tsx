import { ScheduleTimeField } from "@/components/ui/atomic/schedule/schedule-time-field";
import { cn } from "@/lib/utils/utils";

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
  /** Etiqueta del grupo (p.ej. "Horario", "Descanso"). Omítela para no mostrarla. */
  label?: string;
  /** Etiqueta por-slot antes del inicio (p.ej. "Desde:"). Estilo 2026. */
  startLabel?: string;
  /** Etiqueta por-slot antes del fin (p.ej. "Hasta:"). */
  endLabel?: string;
  /** Separador entre slots. Por defecto "a" ("de {inicio} a {fin}"); la clínica usa ":". */
  separator?: string;
  start: TimeRangeFieldSlot;
  end: TimeRangeFieldSlot;
  /** Acota ambos slots (paridad con `lib/utils/schedule-bounds.ts`). */
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
  /** Alinea el contenido a la derecha (tarjetas de la clínica en grid). */
  align?: "start" | "end";
}

/**
 * TimeRangeField — un rango "de {inicio} a {fin}" con etiqueta de grupo
 * opcional. Usado tanto para el horario principal ("Horario") como para el
 * descanso del doctor ("Descanso"): misma gramática visual, sin duplicar
 * layout entre ambos casos ni entre clínica y doctor.
 */
export function TimeRangeField({
  label,
  startLabel,
  endLabel,
  separator = "a",
  start,
  end,
  minTime,
  maxTime,
  disabled,
  align = "start",
}: TimeRangeFieldProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-1",
        align === "end" && "sm:justify-end",
      )}
    >
      {/* Etiqueta de grupo (doctor: "Horario"/"Descanso"): alineada con la
          fila del input, no con el error de abajo → self-start + pt. */}
      {label && (
        <span className="w-16 shrink-0 pt-2.5 text-xs font-medium text-subtle">{label}</span>
      )}
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
      {/* pt-2.5 alinea el separador con la fila del input (no con el error). */}
      <span className="pt-2.5 text-xs text-subtle">{separator}</span>
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
  );
}
