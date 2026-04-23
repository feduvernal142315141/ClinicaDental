import {
  serviceGet,
  servicePost,
  servicePut,
  servicePatch,
} from "@/lib/services/baseService";
import apiInstance from "@/lib/services/apiConfig";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  Appointment,
  AppointmentServiceSnapshot,
  AppointmentStatus,
  AppointmentsQueryParams,
  AvailabilityResponse,
  CancellationReasonCode,
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

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeServicesList(
  raw: unknown,
  fallbackPrimary?: AppointmentServiceSnapshot,
): AppointmentServiceSnapshot[] | undefined {
  if (Array.isArray(raw)) {
    const list = raw
      .map((item) => {
        const r = toRecord(item);
        const serviceId = toStringValue(r.serviceId);
        if (!serviceId) return null;
        return {
          serviceId,
          serviceCode: toStringValue(r.serviceCode),
          serviceName: toStringValue(r.serviceName),
          serviceCost: toOptionalNumber(r.serviceCost),
        } satisfies AppointmentServiceSnapshot;
      })
      .filter((item): item is AppointmentServiceSnapshot => item !== null);
    if (list.length > 0) return list;
  }
  if (fallbackPrimary?.serviceId) return [fallbackPrimary];
  return undefined;
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
    serviceId: toStringValue(source.serviceId),
    serviceCode: toStringValue(source.serviceCode),
    serviceName: toStringValue(source.serviceName),
    serviceCost: toNumberValue(source.serviceCost),
    services: normalizeServicesList(source.services, {
      serviceId: toStringValue(source.serviceId) ?? "",
      serviceCode: toStringValue(source.serviceCode),
      serviceName: toStringValue(source.serviceName),
      serviceCost: toOptionalNumber(source.serviceCost),
    }),
    createdAt:
      toStringValue(source.createdAt) ?? toStringValue(source.createAt),
    updatedAt:
      toStringValue(source.updatedAt) ?? toStringValue(source.updateAt),
    scheduledStartAt: toStringValue(source.scheduledStartAt),
    scheduledEndAt: toStringValue(source.scheduledEndAt),
    // Audit fields
    cancellationReason: toStringValue(source.cancellationReason),
    cancellationReasonCode: toStringValue(source.cancellationReasonCode) as CancellationReasonCode | undefined,
    cancelledAt: toStringValue(source.cancelledAt),
    rescheduledAt: toStringValue(source.rescheduledAt),
    actualStartAt: toStringValue(source.actualStartAt),
    adjustedAt: toStringValue(source.adjustedAt),
    adjustmentReason: toStringValue(source.adjustmentReason),
    labels: Array.isArray(source.labels)
      ? (source.labels as unknown[]).map((l) => {
          const lbl = l as Record<string, unknown>;
          return {
            id: String(lbl.id ?? ""),
            name: String(lbl.name ?? ""),
            color: String(lbl.color ?? "#cccccc"),
            icon: lbl.icon ? String(lbl.icon) : undefined,
          };
        })
      : undefined,
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
  const response = await serviceGet<Appointment>(`${endpoint}/${id}`);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return normalizeAppointment(response.data);
  }

  handleServiceError(response, "Error al cargar la cita");
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
 * Solo citas con estado 'scheduled' o 'in_progress' pueden ser canceladas.
 * Endpoint: PATCH /appointments/{id}/cancel
 */
async function cancelAppointment(
  id: string,
  data?: { reason?: string; reasonCode?: CancellationReasonCode },
): Promise<boolean> {
  if (!id) {
    handleServiceError(null, "ID de cita requerido para cancelar");
  }

  const response = (await apiInstance
    .patch<boolean>(`${endpoint}/${id}/cancel`, data ?? {})
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
  // validateStatus < 500 evita que el interceptor global muestre error toast
  // cuando el backend retorna 400 por "doctor sin horario en ese día".
  const response = await apiInstance.get<AvailabilityResponse>(
    `${endpoint}/availability/doctor/${doctorId}?date=${date}&interval=${interval}`,
    { validateStatus: (s) => s < 500 },
  );

  if (response.status >= 200 && response.status < 300 && response.data) {
    return Array.isArray(response.data.availableTime)
      ? response.data.availableTime
      : [];
  }

  // 400 = doctor sin disponibilidad para ese día → lista vacía sin error toast
  return [];
}

/**
 * Reagenda una cita a una nueva fecha/hora.
 * Solo citas con estado 'scheduled' pueden ser reagendadas.
 * Endpoint: PUT /appointments/{id}/reschedule
 */
async function rescheduleAppointment(
  id: string,
  data: { scheduledStartAt: string; scheduledEndAt: string },
): Promise<boolean> {
  const response = (await apiInstance
    .put<boolean>(`${endpoint}/${id}/reschedule`, data)
    .catch((err) => err.response as unknown)) as
    | { status?: number; data?: unknown; message?: string }
    | undefined;

  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  ) {
    return true;
  }

  const err = response as { status?: number; data?: { message?: string }; message?: string } | undefined;
  if (err?.status === 409) {
    throw Object.assign(
      new Error(err?.data?.message ?? "El doctor tiene otra cita en ese horario"),
      { status: 409 },
    );
  }

  throw new Error(getErrorMessage(response, "Error al reagendar la cita"));
}

/**
 * Inicia una cita cambiando su estado a 'in_progress'.
 * Endpoint: PATCH /appointments/{id}/start
 */
async function startAppointment(id: string): Promise<{ appointmentAdjusted?: boolean; adjustedStartAt?: string }> {
  const response = (await apiInstance
    .patch<{ appointmentAdjusted?: boolean; adjustedStartAt?: string }>(`${endpoint}/${id}/start`, {})
    .catch((err) => err.response as unknown)) as
    | { status?: number; data?: { appointmentAdjusted?: boolean; adjustedStartAt?: string }; message?: string }
    | undefined;

  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  ) {
    return response.data ?? {};
  }

  throw new Error(getErrorMessage(response, "Error al iniciar la cita"));
}

interface StartNowRequest {
  patientId: string;
  doctorId: string;
  reason?: string;
  serviceId?: string;
}

interface StartNowResponse {
  appointmentId: string;
  actualStartAt: string;
}

/**
 * Creates and immediately starts an appointment atomically.
 * POST /appointments/start-now → 201
 */
async function startNowAppointment(
  data: StartNowRequest,
): Promise<StartNowResponse> {
  const response = (await apiInstance
    .post<StartNowResponse>(`${endpoint}/start-now`, data)
    .catch((err) => err.response as unknown)) as
    | { status?: number; data?: StartNowResponse; message?: string }
    | undefined;

  if (
    response &&
    typeof response.status === "number" &&
    response.status === 201 &&
    response.data
  ) {
    return response.data;
  }

  throw new Error(getErrorMessage(response, "Error al iniciar consulta express"));
}

async function completeAppointment(id: string): Promise<boolean> {
  const response = (await apiInstance
    .patch<void>(`${endpoint}/${id}/complete`, {})
    .catch((err) => err.response as unknown)) as
    | { status?: number; data?: unknown; message?: string }
    | undefined;

  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  ) {
    return true;
  }

  throw new Error(getErrorMessage(response, "Error al completar la cita"));
}

export const appointmentsService = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  /** @deprecated Usar cancelAppointment en su lugar */
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  startAppointment,
  completeAppointment,
  getDoctorAppointments,
  getPatientAppointments,
  getDoctorAvailability,
  startNowAppointment,
};

export type { AppointmentStatus };
