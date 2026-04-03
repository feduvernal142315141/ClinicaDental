"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { Appointment } from "@/lib/entity/appointment";

interface AppointmentQuickActionsProps {
  appointment: Appointment;
  children: React.ReactNode;
  onViewDetail?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
}

export function AppointmentQuickActions({
  appointment,
  children,
  onViewDetail,
  onReschedule,
  onCancel,
}: AppointmentQuickActionsProps) {
  const isScheduled = appointment.status === "scheduled";

  const items: MenuProps["items"] = [
    onViewDetail
      ? {
          key: "detail",
          icon: <EyeOutlined />,
          label: "Ver detalle",
          onClick: () => onViewDetail(appointment),
        }
      : null,
    onReschedule && isScheduled
      ? {
          key: "reschedule",
          icon: <CalendarOutlined />,
          label: "Reagendar",
          onClick: () => onReschedule(appointment),
        }
      : null,
    onCancel && isScheduled
      ? {
          key: "cancel",
          icon: <CloseCircleOutlined />,
          label: "Cancelar cita",
          danger: true,
          onClick: () => onCancel(appointment),
        }
      : null,
  ].filter(Boolean);

  if (items.length === 0) {
    return <>{children}</>;
  }

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      {children}
    </Dropdown>
  );
}
