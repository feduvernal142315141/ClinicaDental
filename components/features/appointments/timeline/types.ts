import type { Appointment } from "@/lib/entity/appointment";

/**
 * Props for the DoctorAppointmentsTimeline component.
 */
export interface DoctorAppointmentsTimelineProps {
  /** Citas agendadas del doctor */
  appointments: Appointment[];
  /** Si los datos están cargando */
  loading?: boolean;
  /** Fecha seleccionada para mostrar en el título (YYYY-MM-DD) */
  selectedDate: string;
  /** Nombre del doctor seleccionado */
  doctorName?: string;
  /** Callback para cancelar una cita */
  onCancel?: (appointment: Appointment) => void;
  /** Callback para reagendar (navega a formulario pre-rellenado) */
  onReschedule?: (appointment: Appointment) => void;
}
