"use client";

import { useEffect, useRef } from "react";
import { Typography, Empty } from "antd";
import dayjs from "dayjs";
import { getTimeSlots } from "@/lib/utils/scheduler-layout";
import { AppointmentEventCard } from "./AppointmentEventCard";
import { AppointmentQuickActions } from "./AppointmentQuickActions";
import type { SchedulerEvent, Appointment } from "@/lib/entity/appointment";

const { Text } = Typography;

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
  startConsultationLoading,
}: AppointmentsDayGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
      ref={containerRef}
      style={{
        height: "calc(100vh - 260px)",
        minHeight: 400,
        overflowY: "auto",
        position: "relative",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
      }}
    >
      <div style={{ position: "relative", height: totalHeight }}>
        {/* Time labels + horizontal lines */}
        {slots.map((slot, i) => (
          <div
            key={slot}
            style={{
              position: "absolute",
              top: i * slotHeight,
              left: 0,
              right: 0,
              height: slotHeight,
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <Text
              type="secondary"
              style={{
                width: TIME_COL_WIDTH,
                textAlign: "right",
                paddingRight: 8,
                fontSize: 11,
                lineHeight: `${slotHeight}px`,
                flexShrink: 0,
                userSelect: "none",
              }}
            >
              {slot}
            </Text>
          </div>
        ))}

        {/* Events area */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: TIME_COL_WIDTH,
            right: 8,
            height: totalHeight,
          }}
        >
          {events.length === 0 && !loading && (
            <div
              style={{
                position: "absolute",
                top: "30%",
                left: 0,
                right: 0,
                textAlign: "center",
              }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Sin citas para este día"
              />
            </div>
          )}

          {events.map((ev) => {
            const widthPercent = 100 / ev.totalColumns;
            const leftPercent = ev.column * widthPercent;

            return (
              <div
                key={ev.appointment.id}
                style={{
                  position: "absolute",
                  top: ev.top,
                  height: ev.height,
                  left: `${leftPercent}%`,
                  width: `calc(${widthPercent}% - 2px)`,
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
        </div>

        {/* "Now" line */}
        {nowLineTop !== null && (
          <div
            style={{
              position: "absolute",
              top: nowLineTop,
              left: TIME_COL_WIDTH - 4,
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
    </div>
  );
}
