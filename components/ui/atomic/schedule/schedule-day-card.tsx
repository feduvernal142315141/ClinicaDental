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
  /** Columna izquierda fija (36 = 9rem): normalmente un `DayToggle`. */
  toggleSlot: React.ReactNode;
  /** Zona fluida a la derecha: rangos horarios, hints, estado cerrado. */
  children: React.ReactNode;
  className?: string;
}

/**
 * ScheduleDayCard — tarjeta-fila de un día del editor de horarios (clínica o
 * doctor). Layout: acento lateral de 3px que codifica el estado + columna de
 * toggle fija (`w-36`) + zona de contenido fluida. Responsive: columna en
 * móvil, fila desde `sm:`.
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
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Ancho de contenido con un mínimo para alinear filas: evita que el
            toggle (switch + nombre largo como "Miércoles" + pill) desborde una
            columna fija demasiado estrecha. */}
        <div className="shrink-0 sm:min-w-[9.5rem]">{toggleSlot}</div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
