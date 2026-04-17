import { handleServiceError } from "@/lib/utils/error.utils";
import {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
} from "../baseService";
import type {
  Doctor,
  CreateDoctorRequest,
  UpdateDoctorRequest,
  DoctorChangePasswordRequest,
  DoctorsQueryParams,
  PaginatedDoctorsResponse,
} from "@/lib/entity/doctors";

/**
 * DoctorsService
 *
 * Service for managing doctor operations (CRUD)
 * Base endpoint: /doctor
 */
const endpoint = "/doctor";

/**
 * Build query string from params
 */
function buildQueryString(params?: DoctorsQueryParams): string {
  if (!params) return "";

  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.pageSize)
    queryParams.append("pageSize", params.pageSize.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.role) queryParams.append("role", params.role);
  if (params.active !== undefined)
    queryParams.append("active", params.active.toString());
  if (params.specialty) queryParams.append("specialty", params.specialty);

  return queryParams.toString();
}

/**
 * Get paginated list of doctors
 * GET /doctor?page=1&pageSize=10&search=...
 */
async function getDoctors(
  params?: DoctorsQueryParams
): Promise<PaginatedDoctorsResponse> {
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedDoctorsResponse>(url);
  if (response?.data) {
    // Backend returns { entities: Doctor[], pagination: { page, pageSize, total } }
    return response.data;
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar doctores");
}

/**
 * Get doctor by ID
 * GET /doctor/:id
 */
async function getDoctorById(id: string): Promise<Doctor> {
  const response = await serviceGet<Doctor>(`${endpoint}/${id}`);
  if (response?.data) {
    return response.data;
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar doctor");
}

/**
 * Create new doctor
 * POST /doctor
 */
async function createDoctor(data: CreateDoctorRequest): Promise<Doctor> {
  const response = await servicePost<CreateDoctorRequest, Doctor>(
    endpoint,
    data
  );

  // Check for successful response (2xx status codes)
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }

  handleServiceError(response, "Error al crear doctor");
}

/**
 * Update existing doctor
 * PUT /doctor
 */
async function updateDoctor(
  id: string,
  data: UpdateDoctorRequest
): Promise<Doctor> {
  const response = await servicePut<UpdateDoctorRequest, Doctor>(
    endpoint,
    data
  );

  // Check for successful response (2xx status codes)
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }

  handleServiceError(response, "Error al actualizar doctor");
}

/**
 * Delete doctor
 * DELETE /doctor/:id
 */
async function deleteDoctor(id: string): Promise<void> {
  const response = await serviceDelete(`${endpoint}/${id}`);
  if (!response?.data) {
    handleServiceError(typeof response !== "undefined" ? response : null, "Error al eliminar doctor");
  }
}

/**
 * Change doctor password
 * PUT /doctor/change-password
 */
async function changeDoctorPassword(
  data: DoctorChangePasswordRequest
): Promise<void> {
  const response = await servicePut<DoctorChangePasswordRequest, Record<string, unknown>>(
    `${endpoint}/change-password`,
    data
  );

  if (response?.status >= 200 && response?.status < 300) {
    return;
  }

  handleServiceError(response, "Error al cambiar contraseña");
}

export const doctorsService = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  changeDoctorPassword,
};
