import { Info } from "lucide-react";

import { DayStatusPill } from "@/components/ui/atomic/schedule/day-toggle";
import { CLINIC_DAY_CLOSED_MESSAGE } from "@/lib/utils/schedule-bounds";

export type ClosedStateVariant = "off" | "clinic-closed";

export interface ClosedStateProps {
  /**
   * `"off"` → el usuario apagó el día (neutro, pill "Cerrado").
   * `"clinic-closed"` → la clínica no abre ese día (informativo, ámbar).
   */
  variant: ClosedStateVariant;
  /** Override del copy de `clinic-closed`; por defecto `CLINIC_DAY_CLOSED_MESSAGE`. */
  message?: string;
}

/**
 * ClosedState — qué se muestra en la zona derecha de la tarjeta cuando el día
 * no tiene horario. Dos variantes deliberadamente distintas:
 * - "off": pill neutro "Cerrado" alineado a la derecha.
 * - "clinic-closed": bloque informativo ámbar ("Información" + motivo) — NO es
 *   un error del usuario sino una restricción externa (la clínica no abre).
 */
export function ClosedState({ variant, message }: ClosedStateProps) {
  if (variant === "clinic-closed") {
    return (
      <div className="flex flex-col items-end text-right">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Información
          <Info className="h-3.5 w-3.5 shrink-0" />
        </span>
        <span className="text-[11px] leading-tight text-subtle">
          {message ?? CLINIC_DAY_CLOSED_MESSAGE}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <DayStatusPill open={false} />
    </div>
  );
}
