"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { Appointment } from "@/lib/entity/appointment";
import { isAppointmentActionable } from "@/lib/utils/appointment-utils";

interface AppointmentQuickActionsProps {
  appointment: Appointment;
  children: React.ReactNode;
  onViewDetail?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
}

export function AppointmentQuickActions({
  appointment,
  children,
  onViewDetail,
  onReschedule,
  onCancel,
  onComplete,
}: AppointmentQuickActionsProps) {
  const isActionable = isAppointmentActionable(appointment);
  // A scheduled appointment whose start is in the past is ready to complete
  const canComplete = appointment.status === "scheduled" && !isActionable;
  // Cualquier cita en estado `scheduled` puede cancelarse (incluye no-shows
  // con hora ya pasada). El backend valida completed/cancelled.
  const canCancel = appointment.status === "scheduled";

  const items: MenuProps["items"] = [
    onViewDetail
      ? {
          key: "detail",
          icon: <EyeOutlined />,
          label: "Ver detalle",
          onClick: () => onViewDetail(appointment),
        }
      : null,
    onComplete && canComplete
      ? {
          key: "complete",
          icon: <CheckCircleOutlined />,
          label: "Marcar como realizada",
          onClick: () => onComplete(appointment),
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
    onCancel && canCancel
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
