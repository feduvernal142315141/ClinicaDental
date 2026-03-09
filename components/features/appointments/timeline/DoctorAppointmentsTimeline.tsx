"use client";

import { useMemo } from "react";
import {
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
  { color: string; label: string; tagColor: string; hex: string }
> = {
  scheduled: {
    color: "blue",
    label: "Agendada",
    tagColor: "processing",
    hex: "#1677ff",
  },
  completed: {
    color: "green",
    label: "Completada",
    tagColor: "success",
    hex: "#52c41a",
  },
  cancelled: {
    color: "red",
    label: "Cancelada",
    tagColor: "error",
    hex: "#ff4d4f",
  },
  "no-show": {
    color: "orange",
    label: "No asistió",
    tagColor: "warning",
    hex: "#faad14",
  },
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

  const children = (
    <div className="pb-1">
      {/* Cabecera: paciente + estado + hora */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <UserOutlined className="text-gray-400" />
        <Text strong>{appointment.patientName ?? "Paciente sin nombre"}</Text>
        <Tag color={config.tagColor} className="mx-0">
          {config.label}
        </Tag>
        <Text type="secondary" className="text-xs">
          <ClockCircleOutlined className="mr-1" />
          {appointment.time || "--:--"}
          {appointment.duration ? ` · ${appointment.duration} min` : ""}
        </Text>
      </div>

      {/* Bloque detalle con borde lateral de color */}
      <div
        className="rounded border-l-4 bg-gray-50 px-3 py-2"
        style={{ borderLeftColor: config.hex }}
      >
        <Text className="text-sm text-gray-600">
          {TYPE_LABELS[appointment.type] ?? appointment.type}
          {appointment.reason && (
            <Text type="secondary"> · {appointment.reason}</Text>
          )}
        </Text>
      </div>

      {/* Acciones */}
      {isScheduled && (onCancel || onReschedule) && (
        <Space size="middle" className="ml-1 mt-2">
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
    content: children,
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
            <Timeline items={timelineItems} />
          </div>
        )}
      </Spin>
    </Card>
  );
}
