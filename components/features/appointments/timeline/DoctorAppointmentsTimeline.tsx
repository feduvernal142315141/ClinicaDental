"use client";

import { useMemo } from "react";
import {
  Badge,
  Button,
  Empty,
  Space,
  Spin,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import type { TimelineItemProps } from "antd";
import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Card } from "@/components/ui/antd";
import type { Appointment, AppointmentStatus } from "@/lib/entity/appointment";
import type { DoctorAppointmentsTimelineProps } from "./types";

dayjs.locale("es");

const { Text } = Typography;

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { color: string; label: string; tagColor: string }
> = {
  scheduled: { color: "blue", label: "Agendada", tagColor: "processing" },
  completed: { color: "green", label: "Completada", tagColor: "success" },
  cancelled: { color: "red", label: "Cancelada", tagColor: "error" },
  "no-show": { color: "orange", label: "No asistió", tagColor: "warning" },
};

const TYPE_LABELS: Record<string, string> = {
  consultation: "Consulta",
  control: "Control",
  emergency: "Emergencia",
  "follow-up": "Seguimiento",
  routine: "Rutina",
};

function buildTimelineItem(
  appointment: Appointment,
  onCancel?: (a: Appointment) => void,
  onReschedule?: (a: Appointment) => void,
): TimelineItemProps {
  const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled;
  const isScheduled = appointment.status === "scheduled";

  const label = (
    <Text className="text-xs text-gray-500">
      {appointment.time || "--:--"}
      {appointment.duration ? ` · ${appointment.duration} min` : ""}
    </Text>
  );

  const children = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <UserOutlined className="text-gray-400" />
        <Text className="font-medium">
          {appointment.patientName ?? "Paciente sin nombre"}
        </Text>
        <Tag color={config.tagColor}>{config.label}</Tag>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Badge color={config.color} />
        <span>{TYPE_LABELS[appointment.type] ?? appointment.type}</span>
        {appointment.reason && (
          <>
            <span>·</span>
            <span className="truncate max-w-45">{appointment.reason}</span>
          </>
        )}
      </div>

      {isScheduled && (onCancel || onReschedule) && (
        <Space size="small" className="mt-1">
          {onReschedule && (
            <Tooltip title="Reagendar cita">
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => onReschedule(appointment)}
              >
                Reagendar
              </Button>
            </Tooltip>
          )}
          {onCancel && (
            <Tooltip title="Cancelar cita">
              <Button
                type="link"
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => onCancel(appointment)}
              >
                Cancelar
              </Button>
            </Tooltip>
          )}
        </Space>
      )}
    </div>
  );

  return {
    color: config.color,
    dot: isScheduled ? (
      <ClockCircleOutlined style={{ fontSize: 16 }} />
    ) : undefined,
    label,
    children,
  };
}

/**
 * Timeline de citas agendadas de un doctor para una fecha.
 */
export function DoctorAppointmentsTimeline({
  appointments,
  loading = false,
  selectedDate,
  doctorName,
  onCancel,
  onReschedule,
}: DoctorAppointmentsTimelineProps) {
  const formattedDate = useMemo(
    () => dayjs(selectedDate, "YYYY-MM-DD").format("dddd, D [de] MMMM"),
    [selectedDate],
  );

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) =>
        (a.time ?? "").localeCompare(b.time ?? ""),
      ),
    [appointments],
  );

  const timelineItems = useMemo(
    () =>
      sortedAppointments.map((appt) =>
        buildTimelineItem(appt, onCancel, onReschedule),
      ),
    [sortedAppointments, onCancel, onReschedule],
  );

  const title = doctorName ? `Citas de ${doctorName}` : "Citas Agendadas";

  return (
    <Card
      title={title}
      extra={
        <Text type="secondary" className="text-xs">
          {formattedDate}
        </Text>
      }
    >
      <Spin spinning={loading}>
        {sortedAppointments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay citas agendadas para este día"
          />
        ) : (
          <div className="max-h-125 overflow-y-auto pr-2">
            <Timeline mode="left" items={timelineItems} />
          </div>
        )}
      </Spin>
    </Card>
  );
}
