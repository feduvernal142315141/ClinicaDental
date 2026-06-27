"use client";

import {
  Eye,
  Calendar,
  CircleX,
  CircleCheck,
  Stethoscope,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
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

  const showStartConsultation = !!onStartConsultation && canStartConsultation;
  const showViewDetail = !!onViewDetail;
  const showComplete = !!onComplete && canComplete;
  const showReschedule = !!onReschedule && canReschedule;
  const showCancel = !!onCancel && canCancel;

  const hasItemsAboveCancel =
    showStartConsultation || showViewDetail || showComplete || showReschedule;
  const hasAnyItem = hasItemsAboveCancel || showCancel;

  if (!hasAnyItem) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {showStartConsultation && (
          <DropdownMenuItem
            disabled={startConsultationLoading}
            onClick={() => onStartConsultation?.(appointment)}
          >
            <Stethoscope />
            {appointment.status === "in_progress"
              ? "Continuar consulta"
              : "Iniciar consulta"}
          </DropdownMenuItem>
        )}

        {showViewDetail && (
          <DropdownMenuItem onClick={() => onViewDetail?.(appointment)}>
            <Eye />
            Ver detalle
          </DropdownMenuItem>
        )}

        {showComplete && (
          <DropdownMenuItem onClick={() => onComplete?.(appointment)}>
            <CircleCheck />
            Marcar como realizada
          </DropdownMenuItem>
        )}

        {showReschedule && (
          <DropdownMenuItem onClick={() => onReschedule?.(appointment)}>
            <Calendar />
            Reagendar
          </DropdownMenuItem>
        )}

        {showCancel && (
          <>
            {hasItemsAboveCancel && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant="destructive"
              className="text-destructive"
              onClick={() => onCancel?.(appointment)}
            >
              <CircleX />
              Cancelar cita
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
