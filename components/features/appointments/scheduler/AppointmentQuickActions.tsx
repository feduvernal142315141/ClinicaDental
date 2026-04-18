"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { Appointment } from "@/lib/entity/appointment";
import { isAppointmentActionable } from "@/lib/utils/appointment-utils";

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
  const isActionable = isAppointmentActionable(appointment);

  const items: MenuProps["items"] = [
    onViewDetail
      ? {
          key: "detail",
          icon: <EyeOutlined />,
          label: "Ver detalle",
          onClick: () => onViewDetail(appointment),
        }
      : null,
    onReschedule && isActionable
      ? {
          key: "reschedule",
          icon: <CalendarOutlined />,
          label: "Reagendar",
          onClick: () => onReschedule(appointment),
        }
      : null,
    onCancel && isActionable
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
