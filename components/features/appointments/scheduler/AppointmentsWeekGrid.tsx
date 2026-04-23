"use client";

import { useEffect, useRef } from "react";
import { Typography, Empty } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getTimeSlots } from "@/lib/utils/scheduler-layout";
import { AppointmentEventCard } from "./AppointmentEventCard";
import { AppointmentQuickActions } from "./AppointmentQuickActions";
import type { SchedulerEvent, Appointment } from "@/lib/entity/appointment";

dayjs.locale("es");

const { Text } = Typography;

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
  startConsultationLoading,
}: AppointmentsWeekGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
      <div
        style={{
          height: 400,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: slotHeight,
              background: "#fafafa",
              borderRadius: 4,
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header: days */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, 1fr)`,
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ width: TIME_COL_WIDTH }} />
        {weekDays.map((day) => {
          const d = dayjs(day);
          const isToday = day === todayStr;
          return (
            <div
              key={day}
              style={{
                textAlign: "center",
                padding: "8px 4px",
                borderLeft: "1px solid #f0f0f0",
              }}
            >
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  textTransform: "capitalize",
                  display: "block",
                }}
              >
                {d.format("ddd")}
              </Text>
              <Text
                strong
                style={{
                  fontSize: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: isToday ? "#1677ff" : "transparent",
                  color: isToday ? "#fff" : undefined,
                }}
              >
                {d.format("D")}
              </Text>
            </div>
          );
        })}
      </div>

      {/* Body: scroll area */}
      <div
        ref={containerRef}
        style={{
          height: "calc(100vh - 310px)",
          minHeight: 400,
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, 1fr)`,
            position: "relative",
            height: totalHeight,
            minWidth: 700,
          }}
        >
          {/* Time labels column */}
          <div style={{ position: "relative" }}>
            {slots.map((slot, i) => (
              <div
                key={slot}
                style={{
                  position: "absolute",
                  top: i * slotHeight,
                  width: "100%",
                  height: slotHeight,
                }}
              >
                <Text
                  type="secondary"
                  style={{
                    fontSize: 10,
                    textAlign: "right",
                    display: "block",
                    paddingRight: 6,
                    marginTop: -6,
                    userSelect: "none",
                  }}
                >
                  {slot}
                </Text>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = day === todayStr;

            return (
              <div
                key={day}
                style={{
                  position: "relative",
                  borderLeft: "1px solid #f0f0f0",
                  background: isToday ? "#e6f4ff20" : undefined,
                }}
              >
                {/* Horizontal slot lines */}
                {slots.map((slot, i) => (
                  <div
                    key={slot}
                    style={{
                      position: "absolute",
                      top: i * slotHeight,
                      left: 0,
                      right: 0,
                      height: slotHeight,
                      borderTop: "1px solid #f5f5f5",
                    }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const widthPercent = 100 / ev.totalColumns;
                  const leftPercent = ev.column * widthPercent;

                  return (
                    <div
                      key={ev.appointment.id}
                      style={{
                        position: "absolute",
                        top: ev.top,
                        height: ev.height,
                        left: `calc(${leftPercent}% + 2px)`,
                        width: `calc(${widthPercent}% - 4px)`,
                        zIndex: 1,
                      }}
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
                        <div style={{ height: "100%", position: "relative" }}>
                          <AppointmentEventCard event={ev} />
                        </div>
                      </AppointmentQuickActions>
                    </div>
                  );
                })}

                {/* "Now" line */}
                {isToday && nowLineTop !== null && (
                  <div
                    style={{
                      position: "absolute",
                      top: nowLineTop,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "#f5222d",
                      zIndex: 10,
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: -3,
                        top: -3,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#f5222d",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state overlay */}
        {!hasAnyEvents && !loading && (
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2,
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Sin citas en esta semana"
            />
          </div>
        )}
      </div>
    </div>
  );
}
