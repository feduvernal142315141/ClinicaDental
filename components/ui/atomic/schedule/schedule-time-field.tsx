import { useId } from "react";

import { TimeField } from "@/components/ui/controls/time-field";
import { cn } from "@/lib/utils/utils";

export interface ScheduleTimeFieldProps {
  /** Etiqueta flotante ARRIBA del input (p.ej. "Desde", "Hasta", "Inicio"). */
  label?: string;
  /** Hora "HH:mm" (o "" si vacío). */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Acota el selector (paridad con `lib/utils/schedule-bounds.ts`). */
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  /**
   * Mensaje de error a mostrar bajo el campo (equivalente visual a
   * `FormMessage`: altura reservada, `aria-live="polite"`). Se omite de forma
   * invisible cuando no hay error, para no desplazar los campos vecinos.
   */
  errorMessage?: string;
  className?: string;
}

/**
 * ScheduleTimeField — un slot de hora del editor de horarios (variante
 * ClinicPro): etiqueta flotante ARRIBA + `TimeField` + mensaje de error
 * propio (altura reservada, `aria-live="polite"`, `aria-describedby`).
 *
 * Presentacional (no lee contexto RHF): un mismo átomo sirve al form de
 * Opciones Generales y al de Doctor. El consumidor pasa `value`/`onChange`/
 * `onBlur` y `errorMessage`/`ariaInvalid` desde su propio `field`/`fieldState`.
 */
export function ScheduleTimeField({
  label,
  value,
  onChange,
  onBlur,
  minTime,
  maxTime,
  disabled,
  id,
  ariaLabel,
  ariaInvalid,
  errorMessage,
  className,
}: ScheduleTimeFieldProps) {
  // Id estable para asociar el mensaje de error con el campo (aria-describedby),
  // restaurando la relación de FormControl (WCAG 2.2 — 3.3.1).
  const reactId = useId();
  const errorId = `${id ?? reactId}-error`;

  return (
    <div className={cn("min-w-0 flex-1 space-y-1", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block cursor-pointer text-[11px] font-medium text-subtle"
        >
          {label}
        </label>
      )}
      <TimeField
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        minTime={minTime}
        maxTime={maxTime}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={errorMessage ? errorId : undefined}
      />
      <p
        id={errorId}
        aria-live="polite"
        className={cn(
          "min-h-[1.125rem] text-[0.8rem] leading-tight text-destructive",
          !errorMessage && "invisible",
        )}
      >
        {errorMessage}
      </p>
    </div>
  );
}
