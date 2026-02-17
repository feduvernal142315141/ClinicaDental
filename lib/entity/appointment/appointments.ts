/**
 * Appointments Entity Types
 *
 * Type definitions for appointment-related entities
 */

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show";

export type AppointmentType =
  | "consultation"
  | "control"
  | "emergency"
  | "follow-up"
  | "routine";

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
