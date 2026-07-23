import { Clock } from "lucide-react";

export interface ScheduleHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * ScheduleHeader — encabezado de sección para un editor de horarios (ícono +
 * título + subtítulo opcional). Reemplaza el header de columnas plano
 * ("Día/Estado/Apertura/Cierre") que ya no tiene sentido al pasar de
 * tabla-grid a `ScheduleDayCard`s.
 */
export function ScheduleHeader({ title, subtitle }: ScheduleHeaderProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="rounded-lg bg-brand/10 p-1.5 text-brand">
        <Clock className="h-4 w-4" />
      </span>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-subtle">{subtitle}</p>}
      </div>
    </div>
  );
}
