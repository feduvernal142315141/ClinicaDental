"use client";

import dayjs from "dayjs";
import type { AppointmentStatus, SchedulerEvent } from "@/lib/entity/appointment";
import { cn } from "@/lib/utils/utils";

interface AppointmentEventCardProps {
  event: SchedulerEvent;
  onClick?: (event: SchedulerEvent) => void;
}

const TYPE_LABELS: Record<string, string> = {
  consultation: "Consulta",
  control: "Control",
  emergency: "Urgencia",
  follow_up: "Seguimiento",
  routine: "Rutina",
};

/**
 * Acento por estado (pares Bento emerald/amber/rose/sky).
 * El color de especialista (doctorColor) sigue siendo el acento dominante
 * (borde izquierdo + tinte de fondo); el estado se indica con un punto y,
 * cuando aplica, atenuación del card.
 */
const STATUS_ACCENT: Record<
  AppointmentStatus,
  { dot: string; muted?: boolean; pulse?: boolean; strike?: boolean }
> = {
  scheduled: { dot: "bg-sky-500" },
  in_progress: { dot: "bg-emerald-500", pulse: true },
  completed: { dot: "bg-emerald-500", muted: true },
  cancelled: { dot: "bg-rose-500", muted: true, strike: true },
  "no-show": { dot: "bg-amber-500", muted: true },
  no_show: { dot: "bg-amber-500", muted: true },
};

export function AppointmentEventCard({
  event,
  onClick,
}: AppointmentEventCardProps) {
  const { appointment, doctorColor, height } = event;
  const displayTime =
    appointment.status === "in_progress" && appointment.actualStartAt
      ? dayjs(appointment.actualStartAt).format("HH:mm")
      : appointment.time;
  const isCompact = height < 40;

  const accent = STATUS_ACCENT[appointment.status] ?? STATUS_ACCENT.scheduled;

  const label = [displayTime, appointment.patientName]
    .filter(Boolean)
    .join(" · ");

  const servicesLabel =
    appointment.services && appointment.services.length > 0
      ? appointment.services
          .map((s) => s.serviceName)
          .filter(Boolean)
          .join(" · ")
      : appointment.serviceName;

  const detail = [
    appointment.duration ? `${appointment.duration} min` : null,
    TYPE_LABELS[appointment.type] ?? appointment.type,
    servicesLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  // Tooltip Bento → atributo title nativo (multilínea con \n)
  const tooltip = [
    appointment.patientName ?? "Paciente",
    `${displayTime} — ${appointment.duration} min`,
    appointment.doctorName ? `Dr. ${appointment.doctorName}` : null,
    servicesLabel || null,
    appointment.labels && appointment.labels.length > 0
      ? `Etiquetas: ${appointment.labels.map((l) => l.name).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      onClick={() => onClick?.(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(event);
        }
      }}
      className={cn(
        "absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-lg border-l-[3px] ring-1 ring-inset ring-black/[0.03]",
        "transition-shadow hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        isCompact ? "px-1.5 py-0.5" : "px-2 py-1",
        accent.muted && "opacity-70",
      )}
      style={{
        borderLeftColor: doctorColor,
        backgroundColor: `${doctorColor}14`,
      }}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            accent.dot,
            accent.pulse && "animate-pulse",
          )}
        />
        <span
          className={cn(
            "truncate font-semibold leading-tight text-ink",
            isCompact ? "text-[11px]" : "text-xs",
            accent.strike && "line-through",
          )}
        >
          {label}
        </span>
      </div>

      {!isCompact && detail && (
        <span className="truncate text-[11px] leading-tight text-subtle">
          {detail}
        </span>
      )}

      {!isCompact && appointment.labels && appointment.labels.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {appointment.labels.slice(0, 4).map((labelItem) => (
            <span
              key={labelItem.id}
              aria-hidden
              title={labelItem.name}
              className="h-1.5 w-1.5 rounded-full ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: labelItem.color }}
            />
          ))}
          {appointment.labels.length > 4 && (
            <span className="text-[10px] leading-none text-subtle">
              +{appointment.labels.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
