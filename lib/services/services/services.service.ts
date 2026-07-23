import { handleServiceError } from "@/lib/utils/error.utils";
import {
  serviceGet,
  servicePost,
  servicePut,
  servicePatch,
} from "../baseService";
import { servicesQuery } from "@/lib/query/domains/services";
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

  // Fase 2 (GET semántico) — intención plana; el backend resuelve el significado.
  // Aditivo respecto a filters/orders (coexistencia total); el front deja de armar
  // strings del dialecto de 4 segmentos para la búsqueda y las facetas.
  if (params.q !== undefined && params.q !== "") {
    queryParams.append("q", params.q);
  }
  if (params.active !== undefined) {
    queryParams.append("active", String(params.active));
  }
  if (params.odontogramEnabled !== undefined) {
    queryParams.append("odontogramEnabled", String(params.odontogramEnabled));
  }
  if (params.sort !== undefined && params.sort !== "") {
    queryParams.append("sort", params.sort);
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

  // El 409 ya no se remapea a copy genérica: handleServiceError propaga el
  // mensaje real del backend (p.ej. "...en esta clínica.") vía safeUserMessage,
  // lo que permite distinguir un conflicto scopeado a la clínica de cualquier
  // otro 409 y evita ocultar el matiz de aislamiento multi-tenant.
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

  // Ídem createService: dejamos que el mensaje real del backend fluya en vez
  // de remapear el 409 a copy genérica.
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
  const { filters } = servicesQuery().active(true).odontogramEnabled(true).build();
  const response = await getServices({ filters });
  return response.entities;
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
