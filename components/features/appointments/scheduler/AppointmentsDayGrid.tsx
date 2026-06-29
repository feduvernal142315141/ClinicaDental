"use client";

import { useEffect, useRef } from "react";
import dayjs from "dayjs";
import { CalendarX2, GripVertical } from "lucide-react";
import { getTimeSlots, pixelsToTime } from "@/lib/utils/scheduler-layout";
import { cn } from "@/lib/utils/utils";
import { useEventDrag } from "@/lib/hooks/appointments/use-event-drag";
import { AppointmentEventCard } from "./AppointmentEventCard";
import { AppointmentQuickActions } from "./AppointmentQuickActions";
import type { SchedulerEvent, Appointment } from "@/lib/entity/appointment";

interface AppointmentsDayGridProps {
  date: string;
  events: SchedulerEvent[];
  startHour: number;
  endHour: number;
  slotHeight: number;
  loading?: boolean;
  onEventClick?: (event: SchedulerEvent) => void;
  onViewDetail?: (appointment: Appointment) => void;
  onStartConsultation?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
  /** Clic en un hueco vacío → crear cita prefilled (date, time "HH:mm"). */
  onCreateSlot?: (date: string, time: string) => void;
  /** Arrastrar una cita a otra hora → reagendar. */
  onMoveEvent?: (appointment: Appointment, newDate: string, newTime: string) => void;
  startConsultationLoading?: boolean;
}

const TIME_COL_WIDTH = 56;

export function AppointmentsDayGrid({
  date,
  events,
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
}: AppointmentsDayGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragApi = useEventDrag(!!onMoveEvent, (ev, _x, _y, _dx, dy) => {
    onMoveEvent?.(
      ev.appointment,
      date,
      pixelsToTime(ev.top + dy, startHour, endHour, slotHeight),
    );
  });
  const slots = getTimeSlots(startHour, endHour, 30);
  const totalHeight = slots.length * slotHeight;
  const isToday = dayjs().format("YYYY-MM-DD") === date;

  // Scroll to current hour on mount
  useEffect(() => {
    if (!containerRef.current || !isToday) return;
    const now = dayjs();
    const minutesFromStart = (now.hour() - startHour) * 60 + now.minute();
    if (minutesFromStart > 0) {
      const pixelsPerMinute = slotHeight / 30;
      containerRef.current.scrollTop =
        minutesFromStart * pixelsPerMinute - slotHeight * 2;
    }
  }, [isToday, startHour, slotHeight]);

  // "Now" line position
  const nowLineTop = (() => {
    if (!isToday) return null;
    const now = dayjs();
    const mins = (now.hour() - startHour) * 60 + now.minute();
    if (mins < 0 || mins > (endHour - startHour) * 60) return null;
    return (mins / 30) * slotHeight;
  })();

  if (loading) {
    return (
      <div className="flex flex-col gap-0.5" style={{ height: 400 }}>
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
    <div
      ref={containerRef}
      className="relative overflow-y-auto rounded-bento border border-hairline bg-surface shadow-sm"
      // Mismo offset que el sidebar (Shell: h-[calc(100vh-240px)]) → misma altura.
      style={{ height: "calc(100vh - 240px)", minHeight: 400 }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {/* Líneas + etiquetas SOLO a la hora en punto (aire Bento) */}
        {slots.map((slot, i) =>
          slot.endsWith(":00") ? (
            <div
              key={slot}
              className="absolute inset-x-0 flex items-start border-t border-hairline"
              style={{ top: i * slotHeight, height: slotHeight }}
            >
              <span
                className="sticky left-0 z-[2] shrink-0 select-none bg-surface pr-2 text-right text-[11px] font-medium text-subtle tabular-nums"
                style={{
                  width: TIME_COL_WIDTH,
                  lineHeight: `${slotHeight}px`,
                }}
              >
                {slot}
              </span>
            </div>
          ) : null,
        )}

        {/* Empty state */}
        {events.length === 0 && !loading && (
          <div className="pointer-events-none absolute inset-x-0 top-[30%] flex flex-col items-center justify-center gap-2 text-center">
            <CalendarX2 className="h-8 w-8 text-subtle/60" aria-hidden />
            <span className="text-sm text-subtle">Sin citas para este día</span>
          </div>
        )}

        {/* Events area (clic en hueco vacío → crear) */}
        <div
          className={cn("absolute top-0", onCreateSlot && "cursor-copy")}
          style={{ left: TIME_COL_WIDTH, right: 8, height: totalHeight }}
          onClick={(e) => {
            if (!onCreateSlot || e.target !== e.currentTarget) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onCreateSlot(
              date,
              pixelsToTime(e.clientY - rect.top, startHour, endHour, slotHeight),
            );
          }}
        >
          {events.map((ev) => {
            const widthPercent = 100 / ev.totalColumns;
            const leftPercent = ev.column * widthPercent;
            const isDragging = dragApi.drag?.id === ev.appointment.id;

            return (
              <div
                key={ev.appointment.id}
                className={cn(
                  "absolute",
                  isDragging ? "z-50" : "z-[1]",
                )}
                style={{
                  top: ev.top,
                  height: ev.height,
                  left: `${leftPercent}%`,
                  width: `calc(${widthPercent}% - 2px)`,
                  transform: isDragging
                    ? `translateY(${dragApi.drag?.dy ?? 0}px)`
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
        </div>

        {/* "Now" line */}
        {nowLineTop !== null && (
          <div
            className="pointer-events-none absolute right-0 z-10 h-0.5 bg-destructive"
            style={{ top: nowLineTop, left: TIME_COL_WIDTH - 4 }}
          >
            <div
              className="absolute h-2 w-2 rounded-full bg-destructive"
              style={{ left: -3, top: -3 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
