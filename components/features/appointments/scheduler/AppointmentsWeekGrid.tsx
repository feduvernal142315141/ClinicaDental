"use client";

import { useEffect, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { CalendarOff, GripVertical } from "lucide-react";
import { getTimeSlots, pixelsToTime } from "@/lib/utils/scheduler-layout";
import { cn } from "@/lib/utils/utils";
import { useEventDrag } from "@/lib/hooks/appointments/use-event-drag";
import { EmptyState } from "@/components/ui/atomic/feedback";
import { AppointmentEventCard } from "./AppointmentEventCard";
import { AppointmentQuickActions } from "./AppointmentQuickActions";
import type { SchedulerEvent, Appointment } from "@/lib/entity/appointment";

dayjs.locale("es");

interface AppointmentsWeekGridProps {
  weekDays: string[];
  eventsByDay: Map<string, SchedulerEvent[]>;
  startHour: number;
  endHour: number;
  slotHeight: number;
  loading?: boolean;
  onViewDetail?: (appointment: Appointment) => void;
  onStartConsultation?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
  /** Clic en un hueco vacío de una columna-día → crear cita prefilled. */
  onCreateSlot?: (date: string, time: string) => void;
  /** Arrastrar una cita a otra hora/día → reagendar. */
  onMoveEvent?: (appointment: Appointment, newDate: string, newTime: string) => void;
  startConsultationLoading?: boolean;
}

const TIME_COL_WIDTH = 52;

export function AppointmentsWeekGrid({
  weekDays,
  eventsByDay,
  startHour,
  endHour,
  slotHeight,
  loading,
  onViewDetail,
  onStartConsultation,
  onReschedule,
  onCancel,
  onComplete,
  onCreateSlot,
  onMoveEvent,
  startConsultationLoading,
}: AppointmentsWeekGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragApi = useEventDrag(!!onMoveEvent, (ev, clientX, _clientY, _dx, dy) => {
    // Día destino por geometría de columnas (robusto al scroll/superposición).
    let newDate: string | null = null;
    const cols =
      containerRef.current?.querySelectorAll<HTMLElement>("[data-day]");
    if (cols) {
      for (const col of Array.from(cols)) {
        const r = col.getBoundingClientRect();
        if (clientX >= r.left && clientX < r.right) {
          newDate = col.dataset.day ?? null;
          break;
        }
      }
    }
    // Soltar fuera de toda columna (eje, canalón, fuera del grid) = cancelar.
    if (!newDate) return;
    onMoveEvent?.(
      ev.appointment,
      newDate,
      pixelsToTime(ev.top + dy, startHour, endHour, slotHeight),
    );
  });
  const slots = getTimeSlots(startHour, endHour, 30);
  const totalHeight = slots.length * slotHeight;
  const todayStr = dayjs().format("YYYY-MM-DD");

  // Scroll to current hour on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const now = dayjs();
    const minutesFromStart = (now.hour() - startHour) * 60 + now.minute();
    if (minutesFromStart > 0) {
      const pixelsPerMinute = slotHeight / 30;
      containerRef.current.scrollTop =
        minutesFromStart * pixelsPerMinute - slotHeight * 2;
    }
  }, [startHour, slotHeight]);

  // "Now" line
  const nowLineTop = (() => {
    const now = dayjs();
    const mins = (now.hour() - startHour) * 60 + now.minute();
    if (mins < 0 || mins > (endHour - startHour) * 60) return null;
    return (mins / 30) * slotHeight;
  })();

  const hasAnyEvents = Array.from(eventsByDay.values()).some(
    (evs) => evs.length > 0,
  );

  if (loading && !hasAnyEvents) {
    return (
      <div className="flex h-[400px] flex-col gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded bg-hover"
            style={{ height: slotHeight }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-bento border border-hairline bg-surface shadow-sm">
      {/* Cabecera y cuerpo COMPARTEN el contenedor de scroll → mismas columnas y
          mismo gutter de scrollbar (líneas verticales alineadas) + scroll
          horizontal sincronizado. La cabecera queda sticky arriba. */}
      <div
        ref={containerRef}
        className="relative overflow-auto"
        // Mismo offset que el sidebar (Shell: h-[calc(100vh-240px)]) → calendario
        // y panel lateral a la MISMA altura, con los fondos alineados.
        style={{ height: "calc(100vh - 240px)", minHeight: 400 }}
      >
        {/* Header (sticky top, dentro del scroll) */}
        <div
          className="sticky top-0 z-30 grid border-b border-hairline bg-surface"
          style={{
            gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, 1fr)`,
            minWidth: 700,
          }}
        >
          <div
            className="sticky left-0 z-10 bg-surface"
            style={{ width: TIME_COL_WIDTH }}
          />
          {weekDays.map((day) => {
            const d = dayjs(day);
            const isToday = day === todayStr;
            const isWeekend = [0, 6].includes(d.day());
            return (
              <div
                key={day}
                className={cn(
                  "border-l border-hairline px-1 py-2 text-center",
                  !isToday && isWeekend && "bg-hover",
                )}
              >
                <span className="block text-[11px] capitalize text-subtle">
                  {d.format("ddd")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold",
                    isToday ? "bg-brand text-white" : "text-ink",
                  )}
                >
                  {d.format("D")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Body grid */}
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, 1fr)`,
            height: totalHeight,
            minWidth: 700,
          }}
        >
          {/* Time labels column (eje horario sticky horizontalmente) */}
          <div className="sticky left-0 z-20 bg-surface">
            <div className="relative h-full">
              {slots.map((slot, i) =>
                slot.endsWith(":00") ? (
                  <div
                    key={slot}
                    className="absolute w-full"
                    style={{ top: i * slotHeight, height: slotHeight }}
                  >
                    <span
                      className={cn(
                        "block select-none pr-1.5 text-right text-[10px] font-medium text-subtle tabular-nums",
                        // La 1ª etiqueta (07:00) no se desplaza hacia arriba o el
                        // borde del scroll la recorta.
                        i > 0 && "-mt-1.5",
                      )}
                    >
                      {slot}
                    </span>
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = day === todayStr;
            const isWeekend = [0, 6].includes(dayjs(day).day());

            return (
              <div
                key={day}
                data-day={day}
                className={cn(
                  "relative border-l border-hairline",
                  isToday ? "bg-brand/5" : isWeekend && "bg-hover",
                  onCreateSlot && "cursor-copy",
                )}
                onClick={(e) => {
                  if (!onCreateSlot || e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  onCreateSlot(
                    day,
                    pixelsToTime(
                      e.clientY - rect.top,
                      startHour,
                      endHour,
                      slotHeight,
                    ),
                  );
                }}
              >
                {/* Líneas horizontales SOLO a la hora en punto (aire Bento; la
                    media hora no lleva línea). No interceptan el clic de crear. */}
                {slots.map((slot, i) =>
                  slot.endsWith(":00") ? (
                    <div
                      key={slot}
                      className="pointer-events-none absolute left-0 right-0 border-t border-hairline"
                      style={{ top: i * slotHeight }}
                    />
                  ) : null,
                )}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const widthPercent = 100 / ev.totalColumns;
                  const leftPercent = ev.column * widthPercent;
                  const isDragging = dragApi.drag?.id === ev.appointment.id;

                  return (
                    <div
                      key={ev.appointment.id}
                      className={cn("absolute", isDragging ? "z-50" : "z-[1]")}
                      style={{
                        top: ev.top,
                        height: ev.height,
                        left: `calc(${leftPercent}% + 2px)`,
                        width: `calc(${widthPercent}% - 4px)`,
                        transform: isDragging
                          ? `translate(${dragApi.drag?.dx ?? 0}px, ${dragApi.drag?.dy ?? 0}px)`
                          : undefined,
                        opacity: isDragging ? 0.85 : undefined,
                      }}
                    >
                      <div className="group relative h-full">
                        {onMoveEvent && (
                          <div
                            aria-hidden="true"
                            title="Arrastrar para reagendar"
                            onPointerDown={(e) => dragApi.onPointerDown(e, ev)}
                            onPointerMove={dragApi.onPointerMove}
                            onPointerUp={dragApi.onPointerUp}
                            onPointerCancel={dragApi.onPointerCancel}
                            className={cn(
                              "absolute left-0 top-0 z-10 grid h-full w-2 cursor-grab touch-none select-none place-items-center rounded-l-md transition-opacity hover:bg-hover",
                              isDragging
                                ? "cursor-grabbing opacity-100"
                                : "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100",
                            )}
                          >
                            <GripVertical className="h-3 w-3 text-subtle" />
                          </div>
                        )}
                        <AppointmentQuickActions
                          appointment={ev.appointment}
                          onViewDetail={onViewDetail}
                          onStartConsultation={onStartConsultation}
                          onReschedule={onReschedule}
                          onCancel={onCancel}
                          onComplete={onComplete}
                          startConsultationLoading={startConsultationLoading}
                        >
                          <div className="relative h-full">
                            <AppointmentEventCard event={ev} />
                          </div>
                        </AppointmentQuickActions>
                      </div>
                    </div>
                  );
                })}

                {/* "Now" line */}
                {isToday && nowLineTop !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-destructive"
                    style={{ top: nowLineTop }}
                  >
                    <div className="absolute -left-[3px] -top-[3px] h-2 w-2 rounded-full bg-destructive" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state overlay */}
        {!hasAnyEvents && !loading && (
          <div className="pointer-events-none absolute left-1/2 top-[30%] z-[2] -translate-x-1/2">
            <EmptyState icon={CalendarOff} title="Sin citas en esta semana" />
          </div>
        )}
      </div>
    </div>
  );
}
