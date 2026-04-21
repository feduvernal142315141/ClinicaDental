"use client";

import { Calendar, Badge, Typography, Empty } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import type { SchedulerEvent, Appointment } from "@/lib/entity/appointment";
import { AppointmentQuickActions } from "./AppointmentQuickActions";

dayjs.locale("es");

const { Text } = Typography;

const MAX_PREVIEW = 2;

interface AppointmentsMonthGridProps {
  eventsByDay: Map<string, SchedulerEvent[]>;
  currentDate: string;
  loading?: boolean;
  onDayClick: (date: string) => void;
  onViewDetail?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
}

export function AppointmentsMonthGrid({
  eventsByDay,
  currentDate,
  loading,
  onDayClick,
  onViewDetail,
  onReschedule,
  onCancel,
  onComplete,
}: AppointmentsMonthGridProps) {
  const hasAnyEvents = Array.from(eventsByDay.values()).some(
    (evs) => evs.length > 0,
  );

  const cellRender = (value: Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    const dayEvents = eventsByDay.get(dateStr) ?? [];

    if (dayEvents.length === 0) return null;

    const previews = dayEvents.slice(0, MAX_PREVIEW);
    const remaining = dayEvents.length - MAX_PREVIEW;

    return (
      <div style={{ fontSize: 11 }}>
        {previews.map((ev) => (
          <AppointmentQuickActions
            key={ev.appointment.id}
            appointment={ev.appointment}
            onViewDetail={onViewDetail}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onComplete={onComplete}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
                borderRadius: 3,
                padding: "1px 4px",
                marginBottom: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <Badge color={ev.doctorColor} />
              <Text
                ellipsis
                style={{ fontSize: 11, lineHeight: 1.3, maxWidth: "100%" }}
              >
                {ev.appointment.time} {ev.appointment.patientName}
              </Text>
            </div>
          </AppointmentQuickActions>
        ))}
        {remaining > 0 && (
          <Text
            type="secondary"
            style={{
              fontSize: 10,
              cursor: "pointer",
              display: "block",
              paddingLeft: 4,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(dateStr);
            }}
          >
            +{remaining} más
          </Text>
        )}
      </div>
    );
  };

  if (loading && !hasAnyEvents) {
    return (
      <div
        style={{
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Cargando calendario..."
        />
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
      <Calendar
        fullscreen
        value={dayjs(currentDate)}
        cellRender={(value, info) => {
          if (info.type === "date") return cellRender(value);
          return null;
        }}
        onSelect={(date) => {
          onDayClick(date.format("YYYY-MM-DD"));
        }}
      />
    </div>
  );
}
