import { useId } from "react";

import { TimeField } from "@/components/ui/controls/time-field";
import { cn } from "@/lib/utils/utils";

export interface ScheduleTimeFieldProps {
  /** Etiqueta en línea a la izquierda del input (p.ej. "Desde:"). */
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
   * `FormMessage`: altura reservada, `aria-live="polite"`). Se omite el
   * párrafo de forma invisible (no desmontado) cuando no hay error, para no
   * desplazar los campos vecinos al aparecer/desaparecer.
   */
  errorMessage?: string;
  className?: string;
}

/**
 * ScheduleTimeField — un slot de hora (`w-28`) del editor de horarios:
 * `TimeField` + mensaje de error propio, con el mismo contrato visual que
 * `FormMessage` de `@/components/ui/atomic/forms` (altura mínima reservada,
 * `text-destructive`, `aria-live="polite"`).
 *
 * Deliberadamente presentacional (no lee `useFormField`/contexto de RHF):
 * así un mismo átomo sirve tanto al form de Opciones Generales
 * (`GeneralSettingsFormValues`) como al de Doctor (`DoctorFormValues`) sin
 * acoplar genéricos de react-hook-form. El consumidor pasa `value`/`onChange`
 * /`onBlur` y `errorMessage`/`ariaInvalid` desde el `field`/`fieldState` de su
 * propio `FormField`.
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
  // Id estable para asociar programáticamente el mensaje de error con el
  // campo (aria-describedby), restaurando la relación que da FormControl
  // cuando el control vive dentro de un FormItem (WCAG 2.2 — 3.3.1).
  const reactId = useId();
  const errorId = `${id ?? reactId}-error`;

  return (
    <div className={cn("space-y-1", className)}>
      {/* Etiqueta e input en la MISMA fila (items-center) para que "Desde:"
          quede centrado con el input; el error va debajo de ambos, sin
          descentrar la etiqueta. */}
      <div className="flex items-center gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="shrink-0 cursor-pointer text-xs font-medium text-subtle"
          >
            {label}
          </label>
        )}
        <div className="w-24 shrink-0">
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
        </div>
      </div>
      <p
        id={errorId}
        aria-live="polite"
        className={cn(
          "min-h-[1.125rem] whitespace-nowrap text-[0.8rem] leading-tight text-destructive",
          !errorMessage && "invisible",
        )}
      >
        {errorMessage}
      </p>
    </div>
  );
}
