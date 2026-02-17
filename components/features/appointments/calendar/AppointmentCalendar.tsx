"use client";

import { useCallback } from "react";
import { Badge, Calendar, List, Spin, Tag, Tooltip, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  ClockCircleOutlined,
  UserOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { Card } from "@/components/ui/antd";
import { useAppointmentCalendar } from "@/lib/hooks/appointments/use-appointment-calendar";
import type { Appointment, AppointmentStatus } from "@/lib/entity/appointment";

dayjs.locale("es");

const { Text } = Typography;

interface AppointmentCalendarProps {
  /** Appointments to display on the calendar */
  appointments: Appointment[];
  /** Whether the data is loading */
  loading?: boolean;
  /** Callback when an appointment is clicked */
  onViewAppointment?: (id: string) => void;
}

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "red",
  "no-show": "orange",
};

const STATUS_BADGE: Record<
  AppointmentStatus,
  "processing" | "success" | "error" | "warning"
> = {
  scheduled: "processing",
  completed: "success",
  cancelled: "error",
  "no-show": "warning",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  "no-show": "No asistió",
};

/**
 * Calendar view for appointments.
 *
 * Shows a monthly calendar with appointment badges on each day.
 * Below the calendar, lists the appointments for the selected day.
 */
export function AppointmentCalendar({
  appointments,
  loading = false,
  onViewAppointment,
}: AppointmentCalendarProps) {
  const {
    selectedDate,
    appointmentsByDate,
    selectedDateAppointments,
    onSelectDate,
    onPanelChange,
  } = useAppointmentCalendar({ appointments });

  const dateCellRender = useCallback(
    (date: Dayjs) => {
      const dateStr = date.format("YYYY-MM-DD");
      const dayAppointments = appointmentsByDate.get(dateStr);
      if (!dayAppointments?.length) return null;

      // Group by status for badge counts
      const statusCounts = dayAppointments.reduce(
        (acc, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return (
        <ul className="m-0 list-none p-0">
          {Object.entries(statusCounts).map(([status, count]) => (
            <li key={status} className="mb-0.5">
              <Tooltip
                title={`${count} ${STATUS_LABEL[status as AppointmentStatus] || status}`}
              >
                <Badge
                  status={
                    STATUS_BADGE[status as AppointmentStatus] ?? "default"
                  }
                  text={
                    <Text className="text-xs!">
                      {count}{" "}
                      {STATUS_LABEL[status as AppointmentStatus] ?? status}
                    </Text>
                  }
                />
              </Tooltip>
            </li>
          ))}
        </ul>
      );
    },
    [appointmentsByDate],
  );

  const cellRender = useCallback(
    (current: Dayjs, info: { type: string }) => {
      if (info.type === "date") return dateCellRender(current);
      return null;
    },
    [dateCellRender],
  );

  return (
    <Card
      title="Calendario de Citas"
      styles={{
        body: { padding: 0 },
      }}
    >
      <Spin spinning={loading}>
        <Calendar
          fullscreen={false}
          value={selectedDate}
          onSelect={onSelectDate}
          onPanelChange={onPanelChange}
          cellRender={cellRender}
        />
      </Spin>

      <div className="border-t px-4 py-3">
        <Text strong className="mb-2 block">
          {selectedDate.format("dddd, D [de] MMMM YYYY")}
        </Text>

        {selectedDateAppointments.length === 0 ? (
          <Text type="secondary" className="block py-2 text-center text-sm">
            No hay citas para este día
          </Text>
        ) : (
          <List
            size="small"
            dataSource={selectedDateAppointments}
            renderItem={(apt) => (
              <List.Item
                className={
                  onViewAppointment
                    ? "cursor-pointer transition-colors hover:bg-gray-50"
                    : ""
                }
                onClick={() => onViewAppointment?.(apt.id)}
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center gap-2">
                      <ClockCircleOutlined className="text-gray-400" />
                      <Text className="font-medium">{apt.time || "--:--"}</Text>
                      <Tag color={STATUS_COLOR[apt.status]}>
                        {STATUS_LABEL[apt.status]}
                      </Tag>
                    </div>
                  }
                  description={
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span>
                        <UserOutlined className="mr-1" />
                        {apt.patientName || "Sin paciente"}
                      </span>
                      <span>
                        <MedicineBoxOutlined className="mr-1" />
                        {apt.doctorName || "Sin doctor"}
                        {apt.duration ? ` · ${apt.duration} min` : ""}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
}
