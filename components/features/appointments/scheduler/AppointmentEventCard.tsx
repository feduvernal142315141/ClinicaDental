"use client";

import dayjs from "dayjs";
import { Typography, Tooltip } from "antd";
import type { SchedulerEvent } from "@/lib/entity/appointment";
import { LabelChip } from "@/components/app/labels";

const { Text } = Typography;

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

  return (
    <Tooltip
      title={
        <>
          <div>
            <strong>{appointment.patientName ?? "Paciente"}</strong>
          </div>
          <div>
            {displayTime} — {appointment.duration} min
          </div>
          {appointment.doctorName && <div>Dr. {appointment.doctorName}</div>}
          {servicesLabel && <div>{servicesLabel}</div>}
        </>
      }
      placement="right"
      mouseEnterDelay={0.4}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(event)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(event);
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderLeft: `3px solid ${doctorColor}`,
          backgroundColor: `${doctorColor}14`,
          borderRadius: 4,
          padding: isCompact ? "2px 6px" : "4px 8px",
          cursor: "pointer",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 2px 8px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        <Text
          style={{
            fontSize: isCompact ? 11 : 12,
            fontWeight: 600,
            lineHeight: 1.3,
            color: "#262626",
          }}
          ellipsis
        >
          {label}
        </Text>
        {!isCompact && detail && (
          <Text
            style={{ fontSize: 11, lineHeight: 1.2, color: "#595959" }}
            ellipsis
          >
            {detail}
          </Text>
        )}
        {!isCompact && appointment.labels && appointment.labels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
            {appointment.labels.slice(0, 3).map((label) => (
              <LabelChip key={label.id} label={label} size="xs" />
            ))}
            {appointment.labels.length > 3 && (
              <span style={{ fontSize: 10, color: "#595959" }}>+{appointment.labels.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Tooltip>
  );
}
