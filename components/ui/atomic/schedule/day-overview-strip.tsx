import { cn } from "@/lib/utils/utils";

export interface DayOverviewItem {
  /** Inicial del día (p.ej. "L", "M", "X", "J", "V", "S", "D"). */
  short: string;
  /** Nombre completo, para el título accesible. */
  label: string;
  /** `true` si el día tiene horario configurado (abierto). */
  active: boolean;
}

export interface DayOverviewStripProps {
  /** Texto guía a la izquierda. */
  caption?: string;
  days: DayOverviewItem[];
  className?: string;
}

/**
 * DayOverviewStrip — resumen READ-ONLY de qué días tienen horario (variante
 * ClinicPro): una fila de chips circulares donde el azul de marca indica los
 * días activos y el resto queda en estilo "outline" sutil. Es informativo, no
 * un control: NO togglea el día (eso lo hace el switch de cada tile), para no
 * crear una segunda fuente de verdad.
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
            <span
              title={`${d.label}: ${d.active ? "abierto" : "cerrado"}`}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                d.active
                  ? "bg-brand text-white"
                  : "border border-hairline text-subtle",
              )}
            >
              {d.short}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
