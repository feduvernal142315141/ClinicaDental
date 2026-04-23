"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import type { Appointment } from "@/lib/entity/appointment";
import { isAppointmentActionable } from "@/lib/utils/appointment-utils";

interface AppointmentQuickActionsProps {
  appointment: Appointment;
  children: React.ReactNode;
  onViewDetail?: (appointment: Appointment) => void;
  onStartConsultation?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
  startConsultationLoading?: boolean;
}

export function AppointmentQuickActions({
  appointment,
  children,
  onViewDetail,
  onStartConsultation,
  onReschedule,
  onCancel,
  onComplete,
  startConsultationLoading,
}: AppointmentQuickActionsProps) {
  const isActionable = isAppointmentActionable(appointment);
  // A scheduled appointment whose start is in the past is ready to complete
  const canComplete = appointment.status === "scheduled" && !isActionable;
  // Cancelar: scheduled o in_progress. No si completed, cancelled, no_show, no-show.
  const canCancel =
    appointment.status === "scheduled" || appointment.status === "in_progress";
  // Reagendar: solo scheduled
  const canReschedule = appointment.status === "scheduled";
  // "Iniciar consulta" si la cita está scheduled o in_progress y tiene paciente.
  const canStartConsultation =
    (appointment.status === "scheduled" || appointment.status === "in_progress") &&
    !!appointment.patientId;

  const items: MenuProps["items"] = [
    onStartConsultation && canStartConsultation
      ? {
          key: "start-consultation",
          icon: <MedicineBoxOutlined />,
          label: appointment.status === "in_progress" ? "Continuar consulta" : "Iniciar consulta",
          disabled: startConsultationLoading,
          onClick: () => onStartConsultation(appointment),
        }
      : null,
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
    onReschedule && canReschedule
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
