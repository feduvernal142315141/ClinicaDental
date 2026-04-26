import { handleServiceError } from "@/lib/utils/error.utils";
import {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
  servicePatch,
} from "../baseService";
import type {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientsQueryParams,
  PaginatedPatientsResponse,
} from "@/lib/entity/patients";

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
  if (response?.data) {
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
  if (response?.data) {
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

export const patientsService = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  activatePatient,
  restorePatient,
};
