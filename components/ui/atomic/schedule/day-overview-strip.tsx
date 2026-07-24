import { cn } from "@/lib/utils/utils";

export interface DayOverviewItem {
  /** Inicial del día (p.ej. "L", "M", "X", "J", "V", "S", "D"). */
  short: string;
  /** Nombre completo, para el título accesible. */
  label: string;
  /** `true` si el día tiene horario configurado (abierto). */
  active: boolean;
  /** Alterna el día (abrir/cerrar). Omítelo para dejar el chip solo-lectura. */
  onToggle?: () => void;
  /** Deshabilita el chip (p.ej. día que la clínica no abre). */
  disabled?: boolean;
}

export interface DayOverviewStripProps {
  /** Texto guía a la izquierda. */
  caption?: string;
  days: DayOverviewItem[];
  className?: string;
}

/**
 * DayOverviewStrip — fila de chips circulares que resume Y controla qué días
 * tienen horario: el azul de marca indica los días activos; hacer clic en un
 * chip abre/cierra ese día (misma acción que el switch de su tile — ambos
 * escriben el mismo campo `schedule.<day>.enabled`, así que quedan en sync).
 * Con `onToggle` ausente, el chip queda solo-lectura.
 */
export function DayOverviewStrip({
  caption = "Días de atención:",
  days,
  className,
}: DayOverviewStripProps) {
  return (
    <div
      className={cn(
        "bento flex flex-wrap items-center gap-x-3 gap-y-2 p-3.5",
        className,
      )}
    >
      <span className="text-xs font-medium text-subtle">{caption}</span>
      <ul className="flex items-center gap-1.5" aria-label={caption}>
        {days.map((d, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={d.onToggle}
              disabled={d.disabled || !d.onToggle}
              aria-pressed={d.active}
              title={`${d.label}: ${d.active ? "abierto" : "cerrado"}${
                d.onToggle && !d.disabled
                  ? ` — clic para ${d.active ? "cerrar" : "abrir"}`
                  : ""
              }`}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold outline-none",
                "transition-transform duration-150 ease-out",
                "focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                d.disabled || !d.onToggle
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:scale-110 active:scale-90",
                d.active
                  ? "bg-brand text-white hover:bg-brand-strong"
                  : "border border-hairline text-subtle hover:border-brand/60 hover:text-ink",
              )}
            >
              {d.short}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
