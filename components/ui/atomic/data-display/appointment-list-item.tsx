/**
 * APPOINTMENT LIST ITEM ATOMIC COMPONENT
 *
 * Componente atómico para mostrar un item de cita en listas
 * Reutilizable en calendar-view, patient-details, appointment lists, etc.
 */

import * as React from "react";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Appointment } from "@/lib/entity/appointment/appointments";
import {
  getAppointmentStatusColor,
  getAppointmentStatusText,
} from "@/lib/utils/appointment-utils";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

interface AppointmentListItemProps {
  /** Appointment data */
  appointment: Appointment;

  /** Callback cuando se hace click en el item */
  onClick?: (appointment: Appointment) => void;

  /** Mostrar nombre del paciente (ocultar si el usuario es el paciente) */
  showPatient?: boolean;

  /** Mostrar nombre del doctor (ocultar si el usuario es el doctor) */
  showDoctor?: boolean;

  /** Mostrar tipo de cita */
  showType?: boolean;

  /** Mostrar duración */
  showDuration?: boolean;

  /** Mostrar notas */
  showNotes?: boolean;

  /** Clases CSS adicionales */
  className?: string;
}

// ============================================
// APPOINTMENT LIST ITEM
// ============================================

/**
 * Item de lista de appointment con información configurable
 *
 * @example
 * <AppointmentListItem
 *   appointment={appointment}
 *   onClick={(apt) => handleClick(apt)}
 *   showPatient={user?.roleName !== "patient"}
 *   showDoctor={user?.roleName !== "doctor"}
 *   showType
 *   showDuration
 * />
 */
export function AppointmentListItem({
  appointment,
  onClick,
  showPatient = true,
  showDoctor = true,
  showType = true,
  showDuration = true,
  showNotes = false,
  className,
}: AppointmentListItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(appointment);
    }
  };

  return (
    <div
      className={cn(
        "p-3 border rounded-lg transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
        className
      )}
      onClick={handleClick}
    >
      {/* Header con hora y badge de estado */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{appointment.time}</span>
        <Badge className={getAppointmentStatusColor(appointment.status)}>
          {getAppointmentStatusText(appointment.status)}
        </Badge>
      </div>

      {/* Detalles del appointment */}
      <div className="text-sm space-y-1">
        {showPatient && appointment.patientName && (
          <p>
            <strong>Paciente:</strong> {appointment.patientName}
          </p>
        )}

        {showDoctor && appointment.doctorName && (
          <p>
            <strong>Doctor:</strong> {appointment.doctorName}
          </p>
        )}

        {showType && (
          <p>
            <strong>Tipo:</strong> {appointment.type}
          </p>
        )}

        {showDuration && (
          <p>
            <strong>Duración:</strong> {appointment.duration} min
          </p>
        )}

        {showNotes && appointment.notes && (
          <p className="text-muted-foreground">{appointment.notes}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// APPOINTMENT LIST
// ============================================

interface AppointmentListProps {
  /** Lista de appointments */
  appointments: Appointment[];

  /** Callback cuando se hace click en un item */
  onAppointmentClick?: (appointment: Appointment) => void;

  /** Props a pasar a cada AppointmentListItem */
  itemProps?: Partial<
    Omit<AppointmentListItemProps, "appointment" | "onClick">
  >;

  /** Mensaje cuando la lista está vacía */
  emptyMessage?: string;

  /** Clases CSS adicionales para el contenedor */
  className?: string;
}

/**
 * Lista de appointments con AppointmentListItem
 *
 * @example
 * <AppointmentList
 *   appointments={appointments}
 *   onAppointmentClick={handleClick}
 *   itemProps={{ showPatient: false, showNotes: true }}
 *   emptyMessage="No hay citas"
 * />
 */
export function AppointmentList({
  appointments,
  onAppointmentClick,
  itemProps,
  emptyMessage = "No hay citas programadas.",
  className,
}: AppointmentListProps) {
  if (appointments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {appointments.map((appointment) => (
        <AppointmentListItem
          key={appointment.id}
          appointment={appointment}
          onClick={onAppointmentClick}
          {...itemProps}
        />
      ))}
    </div>
  );
}
