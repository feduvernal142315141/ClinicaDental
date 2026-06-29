"use client";

import { cn } from "@/lib/utils/utils";
import {
  MONTHS_ES,
  WEEKDAYS_ES_MON,
  mondayFirstWeekday,
  parseLocalValue,
  dateToLocalDate,
  isSameLocalDay,
} from "@/lib/datetime";
import type { SchedulerEvent, Appointment } from "@/lib/entity/appointment";
import { AppointmentQuickActions } from "./AppointmentQuickActions";

const MAX_PREVIEW = 2;

interface AppointmentsMonthGridProps {
  eventsByDay: Map<string, SchedulerEvent[]>;
  currentDate: string;
  loading?: boolean;
  onDayClick: (date: string) => void;
  onViewDetail?: (appointment: Appointment) => void;
  onStartConsultation?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
  startConsultationLoading?: boolean;
}

export function AppointmentsMonthGrid({
  eventsByDay,
  currentDate,
  loading,
  onDayClick,
  onViewDetail,
  onStartConsultation,
  onReschedule,
  onCancel,
  onComplete,
  startConsultationLoading,
}: AppointmentsMonthGridProps) {
  const hasAnyEvents = Array.from(eventsByDay.values()).some(
    (evs) => evs.length > 0,
  );

  // Mes a renderizar derivado de `currentDate` (la navegación entre meses la
  // controla la toolbar via goPrev/goNext, que dispara el fetch por rango).
  const ref = parseLocalValue(currentDate) ?? new Date();
  const today = new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const startPad = mondayFirstWeekday(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // ---- Estado de carga inicial (sin datos aún): esqueleto Bento -----------
  if (loading && !hasAnyEvents) {
    return (
      <div className="overflow-hidden rounded-bento border border-hairline bg-surface shadow-sm">
        <div className="grid grid-cols-7 border-b border-hairline bg-elevated text-center text-[11px] font-medium text-subtle">
          {WEEKDAYS_ES_MON.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-hairline">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[92px] bg-surface p-1.5">
              <div className="h-6 w-6 animate-pulse rounded-full bg-hover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-bento border border-hairline bg-surface shadow-sm">
      {/* Cabecera de días de la semana (lunes primero) */}
      <div className="grid grid-cols-7 border-b border-hairline bg-elevated text-center text-[11px] font-medium text-subtle">
        {WEEKDAYS_ES_MON.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grilla del mes: líneas de rejilla via gap-px sobre bg-hairline */}
      <div className="grid grid-cols-7 gap-px bg-hairline">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="min-h-[92px] bg-canvas/40" />;
          }

          const d = new Date(year, month, day);
          const dateStr = dateToLocalDate(d);
          const dayEvents = eventsByDay.get(dateStr) ?? [];
          const previews = dayEvents.slice(0, MAX_PREVIEW);
          const remaining = dayEvents.length - MAX_PREVIEW;
          const isToday = isSameLocalDay(d, today);
          const isCurrent = !isToday && isSameLocalDay(d, ref);

          return (
            <div
              key={day}
              onClick={() => onDayClick(dateStr)}
              className={cn(
                "flex min-h-[92px] flex-col gap-1 p-1.5 text-left transition-colors",
                "cursor-pointer hover:bg-hover",
                isToday ? "bg-brand/5" : "bg-surface",
              )}
            >
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDayClick(dateStr);
                  }}
                  aria-label={`${day} de ${MONTHS_ES[month]} de ${year}, ver día`}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors",
                    isToday && "bg-brand text-white",
                    !isToday && isCurrent && "text-ink ring-1 ring-brand/50",
                    !isToday && !isCurrent && "text-ink hover:bg-hover",
                  )}
                >
                  {day}
                </button>
              </div>

              {/* Chips de eventos, coloreados por especialista (doctorColor) */}
              <div className="flex min-w-0 flex-col gap-0.5">
                {previews.map((ev) => (
                  <span
                    key={ev.appointment.id}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AppointmentQuickActions
                      appointment={ev.appointment}
                      onViewDetail={onViewDetail}
                      onStartConsultation={onStartConsultation}
                      onReschedule={onReschedule}
                      onCancel={onCancel}
                      onComplete={onComplete}
                      startConsultationLoading={startConsultationLoading}
                    >
                      <div
                        className="flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 transition-colors hover:brightness-95"
                        style={{
                          borderLeft: `2px solid ${ev.doctorColor}`,
                          backgroundColor: `${ev.doctorColor}14`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: ev.doctorColor }}
                        />
                        <span className="truncate text-[11px] leading-tight tabular-nums text-ink">
                          {ev.appointment.time} {ev.appointment.patientName}
                        </span>
                      </div>
                    </AppointmentQuickActions>
                  </span>
                ))}

                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(dateStr);
                    }}
                    className="self-start rounded px-1 text-[10px] font-medium text-subtle transition-colors hover:text-ink"
                  >
                    +{remaining} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
