/**
 * Appointments Entity Types
 *
 * Type definitions for appointment-related entities
 */

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show"
  | "in_progress"
  | "no_show";

export type CancellationReasonCode =
  | "PATIENT_CANCELLED"
  | "DOCTOR_CONFLICT"
  | "RESCHEDULE_REQUEST"
  | "NO_SHOW"
  | "OTHER";

export type AppointmentType =
  | "consultation"
  | "control"
  | "emergency"
  | "follow_up"
  | "routine";

/**
 * Snapshot ligero de un servicio asociado a una cita.
 * Backend: com.kodewave.clinic.backend.domain.entities.appointment.AppointmentServiceSnapshot
 */
export interface AppointmentServiceSnapshot {
  serviceId: string;
  serviceCode?: string;
  serviceName?: string;
  serviceCost?: number;
}

/**
 * Appointment entity - Full representation
 */
export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  reason?: string;

  patientId?: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  clinicId?: string;

  /**
   * Servicio principal (primer elemento de `services`). Se mantiene por compatibilidad.
   */
  serviceId?: string;
  serviceCode?: string;
  serviceName?: string;
  serviceCost?: number;

  /**
   * Lista completa de servicios de la cita.
   * Si sólo hay uno, coincide con los campos legacy.
   */
  services?: AppointmentServiceSnapshot[];

  scheduledStartAt?: string; // ISO datetime
  scheduledEndAt?: string;   // ISO datetime

  // Labels (HU-LABEL-001)
  labels?: import("@/lib/entity/label").LabelSummary[];

  // Audit fields (HU-APPT-005)
  cancellationReason?: string;
  cancellationReasonCode?: CancellationReasonCode;
  cancelledAt?: string;
  rescheduledAt?: string;
  actualStartAt?: string;
  adjustedAt?: string;
  adjustmentReason?: string;

  // Backward compatibility with legacy payloads
  patient_id?: string;
  doctor_id?: string;
  clinic_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create appointment request payload
 */
export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number;
  type: AppointmentType;
  status?: AppointmentStatus;
  notes?: string;
  reason?: string;
  /** Legacy: id de servicio único. Se mantiene por compatibilidad. */
  serviceId?: string;
  /** Nuevo: lista de ids de servicios asociados a la cita (uno o más). */
  serviceIds?: string[];
}

/**
 * Update appointment request payload
 */
export interface UpdateAppointmentRequest {
  patientId?: string;
  doctorId?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  duration?: number;
  type?: AppointmentType;
  notes?: string;
  reason?: string;
  serviceId?: string;
  serviceIds?: string[];
}

/**
 * Update appointment status request payload
 */
export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
}

/**
 * Query parameters for appointments list with filtering and pagination
 */
export interface AppointmentsQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

/**
 * Backend pagination structure
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Paginated appointments response from backend
 */
export interface PaginatedAppointmentsResponse {
  entities: Appointment[];
  pagination: Pagination;
}

/**
 * Availability response from backend
 */
export interface AvailabilityResponse {
  availableTime: string[];
}

/**
 * Availability slot for doctor/date exploration views.
 */
export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  doctorName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  interval: number; // minutes
}

/**
 * Filters for availability exploration.
 */
export interface AvailabilityFilters {
  doctorId?: string;
  date?: string; // YYYY-MM-DD
  interval?: number; // minutes
}
