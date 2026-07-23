import { handleServiceError } from "@/lib/utils/error.utils";
import {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
  servicePatch,
  searchTree,
} from "../baseService";
import type {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientsQueryParams,
  PaginatedPatientsResponse,
} from "@/lib/entity/patients";
import type { SearchRequest } from "@/lib/query";

/**
 * PatientsService
 *
 * Service for managing patient operations (CRUD)
 * Base endpoint: /patients
 *
 * Authentication: Bearer Token
 * Required permission: patients
 */
const endpoint = "/patients";

/**
 * Build query string from params
 * Supports filters, orders, and pagination as per backend API spec
 */
function buildQueryString(params?: PatientsQueryParams): string {
  if (!params) return "";

  const queryParams = new URLSearchParams();

  // Pagination
  if (params.page !== undefined)
    queryParams.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    queryParams.append("pageSize", params.pageSize.toString());

  // Filters - format: campo__OPERADOR__valor
  if (params.filters && params.filters.length > 0) {
    params.filters.forEach((filter) => {
      queryParams.append("filters", filter);
    });
  }

  // Orders - format: campo:asc/desc
  if (params.orders && params.orders.length > 0) {
    params.orders.forEach((order) => {
      queryParams.append("orders", order);
    });
  }

  // Fase 2 (GET semántico) — intención plana; el backend resuelve el significado.
  // Aditivo respecto a filters/orders (coexistencia total).
  if (params.q !== undefined && params.q !== "") {
    queryParams.append("q", params.q);
  }
  if (params.active !== undefined) {
    queryParams.append("active", String(params.active));
  }
  if (params.sort !== undefined && params.sort !== "") {
    queryParams.append("sort", params.sort);
  }

  return queryParams.toString();
}

/**
 * Get paginated list of patients
 * GET /patients?page=1&pageSize=10&filters=...&orders=...
 */
async function getPatients(
  params?: PatientsQueryParams,
): Promise<PaginatedPatientsResponse> {
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedPatientsResponse>(url);
  // Check for successful response (200 OK) — un 4xx/5xx con body NO es data
  if (response?.status === 200 && response?.data) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar pacientes",
  );
}

/**
 * Get patient by ID
 * GET /patients/:id
 */
async function getPatientById(id: string): Promise<Patient> {
  const response = await serviceGet<Patient>(`${endpoint}/${id}`);
  // Check for successful response (200 OK) — un 4xx/5xx con body NO es data
  if (response?.status === 200 && response?.data) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar paciente",
  );
}

/**
 * Create new patient
 * POST /patients
 *
 * @returns UUID string of the created patient (not wrapped in object)
 */
async function createPatient(data: CreatePatientRequest): Promise<string> {
  const response = await servicePost<CreatePatientRequest, string>(
    endpoint,
    data,
  );

  // Check for successful response (201 Created)
  if (response?.status === 201 && response?.data) {
    return response.data;
  }

  handleServiceError(response, "Error al crear paciente");
}

/**
 * Update existing patient
 * PUT /patients
 *
 * Note: The id must be included in the request body
 * @returns true on success
 */
async function updatePatient(data: UpdatePatientRequest): Promise<boolean> {
  const response = await servicePut<UpdatePatientRequest, boolean>(
    `${endpoint}/${data.id}`,
    data,
  );

  // Check for successful response (200 OK)
  if (response?.status === 200 && response?.data === true) {
    return true;
  }

  handleServiceError(response, "Error al actualizar paciente");
}

/**
 * Delete patient (soft delete)
 * DELETE /patients/:id
 *
 * Note: This sets active = false, to restore use updatePatient with active: true
 * @returns true on success
 */
async function deletePatient(id: string): Promise<boolean> {
  const response = await serviceDelete<void, boolean>(`${endpoint}/${id}`);

  if (response?.status === 200 && response?.data === true) {
    return true;
  }

  handleServiceError(response, "Error al eliminar paciente");
}

/**
 * Activate a patient (reactivate soft-deleted patient)
 * PATCH /patients/:id/activate
 *
 * @returns void on success
 */
async function activatePatient(id: string): Promise<void> {
  const response = await servicePatch<void, void>(
    `${endpoint}/${id}/activate`,
  );

  if (response?.status === 200 || response?.status === 204) {
    return;
  }

  handleServiceError(response, "Error al activar paciente");
}

/**
 * Restore a deleted patient
 * Convenience method that calls updatePatient with active: true
 */
async function restorePatient(id: string): Promise<boolean> {
  return updatePatient({ id, active: true });
}

/**
 * Search patients by boolean TREE (Fase 3)
 * POST /patients/search
 *
 * Accepts a nested AND/OR tree of logical-field conditions (built with the
 * `and()/or()/patientCond()` DSL from `@/lib/query`) with REAL precedence,
 * e.g. `(name~q OR email~q) AND active`. Same response shape as GET /patients.
 */
async function searchPatientsTree(
  body: SearchRequest,
): Promise<PaginatedPatientsResponse> {
  const response = await searchTree<PaginatedPatientsResponse>(endpoint, body);
  // Check for successful response (200 OK) — un 4xx/5xx con body NO es data
  if (response?.status === 200 && response?.data) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al buscar pacientes",
  );
}

export const patientsService = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  activatePatient,
  restorePatient,
  searchTree: searchPatientsTree,
};
