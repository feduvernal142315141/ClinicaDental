import { handleServiceError } from "@/lib/utils/error.utils";
import {
  serviceGet,
  servicePost,
  servicePut,
  servicePatch,
} from "../baseService";
import type {
  Service,
  ServiceListItem,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServicesQueryParams,
  PaginatedServicesResponse,
} from "@/lib/entity/services";

/**
 * ServicesService
 *
 * Service for managing clinic service catalog (CRUD)
 * Base endpoint: /api/v1/services
 */
const endpoint = "/services";

/**
 * Lanza un error amigable y específico para el conflicto de código duplicado
 * (HTTP 409), en vez del mensaje genérico/técnico del backend.
 */
function throwDuplicateCodeError(): never {
  const error = new Error(
    "Ya existe un servicio con ese código. Usa un código distinto.",
  ) as Error & { status?: number };
  error.status = 409;
  throw error;
}

/**
 * Build query string from params
 */
function buildQueryString(params?: ServicesQueryParams): string {
  if (!params) return "";

  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    queryParams.append("pageSize", params.pageSize.toString());

  if (params.filters && params.filters.length > 0) {
    params.filters.forEach((filter) => {
      queryParams.append("filters", filter);
    });
  }

  if (params.orders && params.orders.length > 0) {
    params.orders.forEach((order) => {
      queryParams.append("orders", order);
    });
  }

  return queryParams.toString();
}

/**
 * Get paginated list of services
 * GET /api/v1/services?page=0&pageSize=10&filters=...&orders=...
 */
async function getServices(
  params?: ServicesQueryParams,
): Promise<PaginatedServicesResponse> {
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedServicesResponse>(url);
  if (response?.data) {
    return response.data;
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar servicios");
}

/**
 * Get service by ID
 * GET /api/v1/services/:id
 */
async function getServiceById(id: string): Promise<Service> {
  const response = await serviceGet<Service>(`${endpoint}/${id}`);
  if (response?.data) {
    return response.data;
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar servicio");
}

/**
 * Create new service
 * POST /api/v1/services
 */
async function createService(
  data: CreateServiceRequest,
): Promise<string | boolean> {
  const response = await servicePost<CreateServiceRequest, string>(
    endpoint,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) {
    // El backend devuelve el UUID del servicio creado; lo propagamos (truthy).
    return (response.data as unknown as string) || true;
  }

  if (response?.status === 409) {
    throwDuplicateCodeError();
  }

  handleServiceError(response, "Error al crear servicio");
}

/**
 * Update service
 * PUT /api/v1/services (id goes in body, not URL)
 */
async function updateService(
  id: string,
  data: Omit<UpdateServiceRequest, "id">,
): Promise<boolean> {
  const response = await servicePut<UpdateServiceRequest, boolean>(endpoint, {
    ...data,
    id,
  });

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  if (response?.status === 409) {
    throwDuplicateCodeError();
  }

  handleServiceError(response, "Error al actualizar servicio");
}

/**
 * Toggle service status (activate/inactivate)
 * PATCH /api/v1/services/:id/toggle-status
 */
async function toggleServiceStatus(id: string): Promise<boolean> {
  const response = await servicePatch(`${endpoint}/${id}/toggle-status`);

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al cambiar estado del servicio");
}

/**
 * Get active services enabled for odontogram (for selectors).
 * Uses backend filter format: field__OP__value
 */
async function getActiveOdontogramServices(): Promise<ServiceListItem[]> {
  const filters = [
    buildFilter("active", "EQ", true, "AND"),
    buildFilter("odontogramEnabled", "EQ", true, "AND"),
  ];
  const response = await getServices({ filters });
  return response.entities;
}

/**
 * Helper: Build filter string (services backend format)
 * Example: buildFilter('name', 'CONTAINS', 'Limpieza') => 'name__CONTAINS__Limpieza__AND'
 */
export function buildFilter(
  field: string,
  operator: string,
  value: string | boolean | Date,
  concat: "AND" | "OR" = "AND",
): string {
  let formattedValue = String(value);

  if (value instanceof Date) {
    formattedValue = value.toISOString().split("T")[0];
  }

  return `${field}__${operator}__${formattedValue}__${concat}`;
}

/**
 * Helper: Build order string (canonical backend format)
 * Example: buildOrder('name', 'asc') => 'name__ASC'
 */
export function buildOrder(field: string, direction: "asc" | "desc"): string {
  return `${field}__${direction.toUpperCase()}`;
}

/**
 * Exported service object
 */
export const servicesService = {
  getServices,
  getServiceById,
  createService,
  updateService,
  toggleServiceStatus,
  getActiveOdontogramServices,
};
