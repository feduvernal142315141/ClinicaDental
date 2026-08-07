import { serviceGet, servicePost, servicePut, servicePatch } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  CreateTreatmentPlanRequest,
  UpdateTreatmentPlanRequest,
  TreatmentPlanResponse,
  PaginatedTreatmentPlansResponse,
  PaginatedQueryParams,
} from "@/lib/entity/odontogram";

/**
 * TreatmentPlanService
 *
 * Service layer for treatment-plan CRUD operations.
 * Base endpoint: /treatment-plans
 *
 * Authentication: Bearer Token
 * Required permission: odontogram
 */
const endpoint = "/treatment-plans";

/**
 * Build query string from paginated params.
 */
function buildQueryString(params?: PaginatedQueryParams): string {
  if (!params) return "";

  const qp = new URLSearchParams();

  if (params.page !== undefined) qp.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    qp.append("pageSize", params.pageSize.toString());

  if (params.filters?.length) {
    params.filters.forEach((f) => qp.append("filters", f));
  }

  if (params.orders?.length) {
    params.orders.forEach((o) => qp.append("orders", o));
  }

  return qp.toString();
}

/**
 * Create a new treatment plan.
 * POST /treatment-plans
 *
 * @returns UUID string of the created plan.
 */
async function createTreatmentPlan(
  data: CreateTreatmentPlanRequest,
): Promise<string> {
  const response = await servicePost<CreateTreatmentPlanRequest, string>(
    endpoint,
    data,
  );

  if (response?.status === 201 && response?.data) {
    return response.data as unknown as string;
  }

  handleServiceError(response, "Error al crear el plan de tratamiento");
}

/**
 * Update an existing treatment plan.
 * PUT /treatment-plans
 *
 * @returns true on success.
 */
async function updateTreatmentPlan(
  data: UpdateTreatmentPlanRequest,
): Promise<boolean> {
  const response = await servicePut<UpdateTreatmentPlanRequest, boolean>(
    endpoint,
    data,
  );

  if (response?.status === 200 && response?.data === true) {
    return true;
  }

  handleServiceError(response, "Error al actualizar el plan de tratamiento");
}

/**
 * Cancel a treatment plan.
 * PATCH /treatment-plans/{id}/cancel
 *
 * @returns true on success.
 */
async function cancelTreatmentPlan(id: string): Promise<boolean> {
  const response = await servicePatch<Record<string, never>, boolean>(
    `${endpoint}/${id}/cancel`,
    {},
  );

  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  ) {
    return true;
  }

  handleServiceError(response, "Error al cancelar el plan de tratamiento");
}

/**
 * Get a single treatment plan by ID.
 * GET /treatment-plans/{id}
 *
 * @returns TreatmentPlanResponse or null when not found.
 */
async function getTreatmentPlan(
  id: string,
): Promise<TreatmentPlanResponse | null> {
  const response = await serviceGet<TreatmentPlanResponse | null>(
    `${endpoint}/${id}`,
  );

  if (response?.status === 200) {
    return response.data ?? null;
  }

  handleServiceError(response, "Error al cargar el plan de tratamiento");
}

/**
 * List treatment plans for a patient (paginated).
 * GET /treatment-plans/patient/{patientId}
 */
async function getTreatmentPlansByPatient(
  patientId: string,
  params?: PaginatedQueryParams,
): Promise<PaginatedTreatmentPlansResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/patient/${patientId}${qs ? `?${qs}` : ""}`;

  const response = await serviceGet<PaginatedTreatmentPlansResponse>(url);

  // `serviceGet` devuelve la AxiosResponse COMPLETA y NUNCA rechaza: un 403 o un
  // 500 llegan como respuesta RESUELTA cuyo `.data` es el CUERPO DE ERROR.
  // Comprobar solo `response?.data` (lo que hacía antes esta función) daba ese
  // cuerpo por bueno, `entities` salía `undefined` y la pantalla concluía "este
  // paciente no tiene planes" ante un fallo de permisos o del servidor.
  // Es especialmente grave para el get-or-create del borrador activo
  // (`usePatientTreatmentPlan`): leer un 500 como "no hay plan" habría creado un
  // plan nuevo en CADA fallo.
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    Array.isArray(response.data?.entities)
  ) {
    return response.data;
  }

  handleServiceError(
    response ?? null,
    "Error al cargar los planes de tratamiento",
  );
}

export const treatmentPlanService = {
  createTreatmentPlan,
  updateTreatmentPlan,
  cancelTreatmentPlan,
  getTreatmentPlan,
  getTreatmentPlansByPatient,
};
