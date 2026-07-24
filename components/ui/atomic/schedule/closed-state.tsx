import { cn } from "@/lib/utils/utils";
import { CLINIC_DAY_CLOSED_MESSAGE } from "@/lib/utils/schedule-bounds";

export type ClosedStateVariant = "off" | "clinic-closed";

export interface ClosedStateProps {
  /**
   * `"off"` → el usuario apagó el día (neutro).
   * `"clinic-closed"` → la clínica no abre ese día (informativo, ámbar).
   */
  variant: ClosedStateVariant;
  /** Copy explicativo; por defecto un mensaje según la variante. */
  message?: string;
}

/**
 * ClosedState — cuerpo del tile cuando el día no tiene horario (variante
 * ClinicPro): una caja de borde PUNTEADO con un mensaje explicativo centrado,
 * en vez de campos vacíos. Dos variantes:
 * - "off": el usuario cerró el día (neutro).
 * - "clinic-closed": restricción externa (la clínica no abre) → ámbar
 *   informativo, no rojo de error.
 */
export function ClosedState({ variant, message }: ClosedStateProps) {
  const isClinic = variant === "clinic-closed";
  const text =
    message ?? (isClinic ? CLINIC_DAY_CLOSED_MESSAGE : "Este día está cerrado.");

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-bento border border-dashed px-4 py-5 text-center text-[13px] leading-snug",
        isClinic
          ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
          : "border-hairline text-subtle",
      )}
    >
      {text}
    </div>
  );
}
