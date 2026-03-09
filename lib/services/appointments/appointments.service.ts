import {
  serviceGet,
  servicePost,
  servicePut,
} from "@/lib/services/baseService";
import apiInstance from "@/lib/services/apiConfig";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentsQueryParams,
  AvailabilityResponse,
  CreateAppointmentRequest,
  PaginatedAppointmentsResponse,
  UpdateAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from "@/lib/entity/appointment";

const endpoint = "/appointments";

type ResponseErrorShape = {
  data?: {
    message?: string;
    details?: string;
  };
  message?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildQueryString(params?: AppointmentsQueryParams): string {
  if (!params) return "";

  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.append("page", String(params.page));
  if (params.pageSize !== undefined)
    queryParams.append("pageSize", String(params.pageSize));

  if (params.filters?.length) {
    params.filters.forEach((filter) => queryParams.append("filters", filter));
  }

  if (params.orders?.length) {
    params.orders.forEach((order) => queryParams.append("orders", order));
  }

  return queryParams.toString();
}

function getErrorMessage(response: unknown, fallback: string): string {
  const err = response as ResponseErrorShape | undefined;
  return err?.data?.message || err?.data?.details || err?.message || fallback;
}

function normalizeAppointment(raw: unknown): Appointment {
  const source = toRecord(raw);
  const patient = toRecord(source.patient);
  const doctor = toRecord(source.doctor);

  const patientId =
    toStringValue(source.patientId) ?? toStringValue(source.patient_id) ?? "";
  const doctorId =
    toStringValue(source.doctorId) ?? toStringValue(source.doctor_id) ?? "";
  const clinicId =
    toStringValue(source.clinicId) ?? toStringValue(source.clinic_id);

  const status = toStringValue(source.status) as AppointmentStatus | undefined;
  const type = toStringValue(source.type) as Appointment["type"] | undefined;

  return {
    id: toStringValue(source.id) ?? "",
    date: toStringValue(source.date) ?? "",
    time: toStringValue(source.time) ?? "",
    duration: toNumberValue(source.duration),
    status: status ?? "scheduled",
    type: type ?? "consultation",
    notes: toStringValue(source.notes),
    reason: toStringValue(source.reason),
    patientId,
    patient_id: patientId,
    patientName:
      toStringValue(source.patientName) ??
      toStringValue(patient.name) ??
      toStringValue(patient.fullName) ??
      toStringValue(patient.patientName),
    doctorId,
    doctor_id: doctorId,
    doctorName:
      toStringValue(source.doctorName) ??
      toStringValue(doctor.name) ??
      toStringValue(doctor.fullName),
    clinicId,
    clinic_id: clinicId,
    createdAt:
      toStringValue(source.createdAt) ?? toStringValue(source.createAt),
    updatedAt:
      toStringValue(source.updatedAt) ?? toStringValue(source.updateAt),
  };
}

async function getAppointments(
  params?: AppointmentsQueryParams,
): Promise<PaginatedAppointmentsResponse> {
  // TODO: Keep for compatibility. Backend currently does not expose this endpoint.
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedAppointmentsResponse>(url);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    const entities = Array.isArray(response.data.entities)
      ? response.data.entities.map((item) => normalizeAppointment(item))
      : [];

    return {
      entities,
      pagination: {
        page: response.data.pagination?.page ?? 0,
        pageSize: response.data.pagination?.pageSize ?? 10,
        total: response.data.pagination?.total ?? 0,
      },
    };
  }

  throw new Error(getErrorMessage(response, "Error al cargar citas"));
}

async function getAppointmentById(id: string): Promise<Appointment> {
  // TODO: Keep for compatibility. Backend currently does not expose this endpoint.
  const response = await serviceGet<Appointment>(`${endpoint}/${id}`);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return normalizeAppointment(response.data);
  }

  throw new Error(getErrorMessage(response, "Error al cargar la cita"));
}

async function createAppointment(
  data: CreateAppointmentRequest,
): Promise<string> {
  const payload: CreateAppointmentRequest = {
    ...data,
    status: data.status ?? "scheduled",
  };

  const response = await servicePost<
    CreateAppointmentRequest,
    string | Appointment
  >(endpoint, payload);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    if (typeof response.data === "string") return response.data;

    const maybeAppointment = normalizeAppointment(response.data);
    if (maybeAppointment.id) return maybeAppointment.id;

    return "created";
  }

  throw new Error(getErrorMessage(response, "Error al crear cita"));
}

async function updateAppointment(
  id: string,
  data: UpdateAppointmentRequest,
): Promise<boolean> {
  const response = await servicePut<
    UpdateAppointmentRequest,
    boolean | Appointment
  >(`${endpoint}/${id}`, data);

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  throw new Error(getErrorMessage(response, "Error al actualizar cita"));
}

/**
 * @deprecated El backend ya no expone PATCH /appointments/{id}/status genérico.
 * Usar `cancelAppointment` directamente para cancelar citas.
 * Se mantiene temporalmente por compatibilidad.
 */
async function updateAppointmentStatus(
  id: string,
  data: UpdateAppointmentStatusRequest,
): Promise<boolean> {
  const response = (await apiInstance
    .patch<boolean>(`${endpoint}/${id}/status`, data)
    .catch((err) => err.response as unknown)) as
    | {
        status?: number;
        data?: unknown;
        message?: string;
      }
    | undefined;

  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  ) {
    return true;
  }

  throw new Error(
    getErrorMessage(response, "Error al cambiar estado de la cita"),
  );
}

/**
 * Cancela una cita cambiando su estado a 'cancelled'.
 * Solo citas con estado 'scheduled' pueden ser canceladas.
 * Endpoint: PATCH /appointments/{id}/cancel
 */
async function cancelAppointment(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("ID de cita requerido para cancelar");
  }

  const response = (await apiInstance
    .patch<boolean>(`${endpoint}/${id}/cancel`, {})
    .catch((err) => err.response as unknown)) as
    | {
        status?: number;
        data?: unknown;
        message?: string;
      }
    | undefined;

  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  ) {
    return true;
  }

  throw new Error(getErrorMessage(response, "Error al cancelar la cita"));
}

/**
 * Obtiene las citas agendadas (no canceladas) de un doctor para una fecha específica.
 * Incluye información del paciente, horario, duración, estado y tipo.
 * Endpoint: GET /appointments/doctor/{doctorId}?date={YYYY-MM-DD}
 */
async function getDoctorAppointments(
  doctorId: string,
  date: string,
): Promise<Appointment[]> {
  const response = await serviceGet<Appointment[]>(
    `${endpoint}/doctor/${doctorId}?date=${date}`,
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : [];
    return items.map((item) => normalizeAppointment(item));
  }

  throw new Error(
    getErrorMessage(response, "Error al obtener citas del doctor"),
  );
}

/**
 * Obtiene todas las citas de un paciente.
 * Endpoint: GET /appointments/patient/{patientId}
 */
async function getPatientAppointments(
  patientId: string,
): Promise<Appointment[]> {
  const response = await serviceGet<Appointment[]>(
    `${endpoint}/patient/${patientId}`,
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : [];
    return items.map((item) => normalizeAppointment(item));
  }

  throw new Error(
    getErrorMessage(response, "Error al obtener citas del paciente"),
  );
}

async function getDoctorAvailability(
  doctorId: string,
  date: string,
  interval = 15,
): Promise<string[]> {
  const response = await serviceGet<AvailabilityResponse>(
    `${endpoint}/availability/doctor/${doctorId}?date=${date}&interval=${interval}`,
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return Array.isArray(response.data.availableTime)
      ? response.data.availableTime
      : [];
  }

  throw new Error(
    getErrorMessage(response, "Error al obtener disponibilidad del doctor"),
  );
}

export const appointmentsService = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  /** @deprecated Usar cancelAppointment en su lugar */
  updateAppointmentStatus,
  cancelAppointment,
  getDoctorAppointments,
  getPatientAppointments,
  getDoctorAvailability,
};

export type { AppointmentStatus };
