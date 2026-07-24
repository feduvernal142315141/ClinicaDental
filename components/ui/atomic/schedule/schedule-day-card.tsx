import * as React from "react";

import { cn } from "@/lib/utils/utils";

/**
 * Estado visual de una tarjeta-día de horario. Codifica de un vistazo si el
 * día está abierto, cerrado por el propio horario, o cerrado porque la
 * clínica no abre ese día (distinto de un simple "cerrado": es informativo,
 * no un error).
 */
export type ScheduleDayStatus = "open" | "closed" | "clinic-closed";

const ACCENT_BY_STATUS: Record<ScheduleDayStatus, string> = {
  open: "bg-brand",
  closed: "bg-hairline",
  "clinic-closed": "bg-amber-400/60",
};

const BACKGROUND_BY_STATUS: Record<ScheduleDayStatus, string> = {
  open: "bg-surface",
  closed: "bg-hover/40",
  "clinic-closed": "bg-amber-500/[0.04]",
};

export interface ScheduleDayCardProps {
  /** Estado del día: decide el color del acento lateral y el fondo. */
  status: ScheduleDayStatus;
  /** Cabecera de identidad: normalmente un `DayToggle`. */
  toggleSlot: React.ReactNode;
  /** Cuerpo de controles: rangos horarios, hints, estado cerrado. */
  children: React.ReactNode;
  className?: string;
}

/**
 * ScheduleDayCard — tile-día del editor de horarios (clínica o doctor).
 * Layout Bento 2026: acento lateral de 3px que codifica el estado + columna
 * de contenido de ancho completo, apilada en dos filas — cabecera de
 * identidad (`toggleSlot`) sobre cuerpo de controles (`children`) —, ambas
 * naciendo del borde izquierdo. Deliberadamente SIN fila lado-a-lado
 * (toggle-columna-fija + contenido-flex): ese layout dejaba un hueco muerto
 * cuando los controles se empujaban al extremo derecho.
 *
 * Componente puro de presentación — no conoce react-hook-form ni el dominio
 * (clínica vs. doctor); el consumidor decide `status` y arma `toggleSlot`
 * junto con el contenido.
 */
export function ScheduleDayCard({
  status,
  toggleSlot,
  children,
  className,
}: ScheduleDayCardProps) {
  return (
    <div
      className={cn(
        "flex items-stretch gap-3 rounded-xl border border-hairline p-3.5 transition-colors duration-150",
        BACKGROUND_BY_STATUS[status],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "w-[3px] self-stretch rounded-full transition-colors duration-150",
          ACCENT_BY_STATUS[status],
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="min-w-0">{toggleSlot}</div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
