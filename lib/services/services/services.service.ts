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
  SetOdontogramVisibilityRequest,
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

  // OJO: no añadir aquí `q`/`active`/`odontogramEnabled`/`sort`. El controller
  // (ServiceController#getAll) solo declara filters/orders/page/pageSize, así que
  // Spring descarta cualquier otro parámetro EN SILENCIO — el buscador parecía
  // funcionar y no filtraba nada. Toda intención se expresa como filtro
  // estructurado vía `servicesQuery()`.
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
  // `serviceGet` NUNCA rechaza: un 403 o un 500 llegan como respuesta RESUELTA
  // con `.data` = cuerpo de error, que es truthy. Comprobar solo `.data`
  // devolvía ese cuerpo como si fuera la página de servicios; quien leyera
  // `.entities` obtenía `undefined` (o una lista vacía tras un `?? []`), o sea
  // "no hay servicios" cuando lo que hay es un error. Este es el PUNTO ÚNICO:
  // cura también a `getActiveOdontogramServices` y `getGeneralServices`, que
  // delegan aquí.
  if (
    typeof response?.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(response ?? null, "Error al cargar servicios");
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
 * Set whether a service is planned tooth-by-tooth on the odontogram.
 * PATCH /api/v1/services/:id/odontogram-visibility  body: { odontogramEnabled }
 */
async function setOdontogramVisibility(
  id: string,
  odontogramEnabled: boolean,
): Promise<boolean> {
  const response = await servicePatch<SetOdontogramVisibilityRequest, boolean>(
    `${endpoint}/${id}/odontogram-visibility`,
    { odontogramEnabled },
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(
    response,
    "Error al cambiar la visibilidad en el odontograma",
  );
}

/**
 * Get active services enabled for odontogram (for selectors).
 * Uses backend filter format: field__OP__value
 */
async function getActiveOdontogramServices(): Promise<ServiceListItem[]> {
  const { filters, orders } = servicesQuery()
    .active(true)
    .odontogramEnabled(true)
    // Por nombre: es un catálogo que se lee para BUSCAR un procedimiento. Sin
    // `orders` el backend cae a `createAt DESC` (BaseRepositoryImpl), o sea
    // orden de alta, que para eso es arbitrario.
    .order("name", "asc")
    .build();
  // `pageSize` explícito: omitirlo manda 0, que el backend traduce a
  // MAX_PAGE_SIZE=100. Fijarlo deja el techo a la vista en vez de escondido en
  // un default; si una clínica supera los 100 servicios de odontograma habrá
  // que paginar aquí (precedente: el bucle de ExportServicesPdfQueryHandler).
  const response = await getServices({ filters, orders, pageSize: 100 });
  return response.entities;
}

/**
 * Get active services that are NOT planned tooth-by-tooth (for the "generales"
 * tab of the treatment plan). Complemento exacto de
 * {@link getActiveOdontogramServices}: mismo catálogo activo, `odontogramEnabled`
 * al revés. Son las líneas que el plan marca como generales y que el
 * odontograma no puede representar sobre una pieza.
 */
async function getGeneralServices(): Promise<ServiceListItem[]> {
  const { filters, orders } = servicesQuery()
    .active(true)
    .odontogramEnabled(false)
    // Mismo motivo que en getActiveOdontogramServices: sin `orders` el backend
    // cae a `createAt DESC`, o sea orden de alta, arbitrario para un catálogo
    // que se lee para BUSCAR un procedimiento.
    .order("name", "asc")
    .build();
  // `pageSize` explícito: omitirlo manda 0 y el backend lo traduce a
  // MAX_PAGE_SIZE=100. Fijarlo deja el techo a la vista.
  const response = await getServices({ filters, orders, pageSize: 100 });
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
  setOdontogramVisibility,
  getActiveOdontogramServices,
  getGeneralServices,
};
