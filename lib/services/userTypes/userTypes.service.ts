/**
 * UserTypes Service
 *
 * Catálogo de solo lectura de tipos de usuario global.
 */
import { serviceGet } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  UserType,
  GetUserTypesPageParams,
  PaginatedUserTypesResponse,
} from "@/lib/entity/userType";

const endpoint = "/user-types";

// El backend serializa el booleano como `archived` (campo Java `isArchived`
// con getter Lombok `isArchived()` → Jackson quita el prefijo "is"). El resto
// del frontend usa `isArchived`; normalizamos aceptando ambas claves (mismo
// gotcha ya resuelto en labels.service — sin esto, archivar "no se ve").
function normalizeArchived(t: UserType): UserType {
  return {
    ...t,
    isArchived:
      (t as { isArchived?: boolean }).isArchived ??
      (t as { archived?: boolean }).archived ??
      false,
  };
}

async function getUserTypes(includeArchived = false): Promise<UserType[]> {
  const url = includeArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const response = await serviceGet<UserType[]>(url);
  if (response?.status === 200) {
    const raw =
      (response.data as unknown as { data?: UserType[] })?.data ??
      (response.data as unknown as UserType[]) ??
      [];
    return raw.map(normalizeArchived);
  }
  handleServiceError(response, "Error al obtener los tipos de usuario");
  return [];
}

/**
 * Build query string for GET /user-types — filters/orders/page/pageSize/includeArchived,
 * mismo patrón que labelsService.buildLabelsPageQuery / doctorsService.buildQueryString
 * (separador canónico "__").
 */
function buildUserTypesPageQuery(params: GetUserTypesPageParams): string {
  const queryParams = new URLSearchParams();

  const query = params.query?.trim();
  if (query) {
    // CONTAINS_IGNORE_CASE (unaccent+lower server-side) para que la búsqueda
    // server coincida con matchesQuery del modo cliente.
    queryParams.append("filters", `name__CONTAINS_IGNORE_CASE__${query}`);
  }
  queryParams.append("orders", "name__ASC");

  if (params.page !== undefined) queryParams.append("page", String(params.page));
  if (params.pageSize !== undefined) queryParams.append("pageSize", String(params.pageSize));
  if (params.includeArchived) queryParams.append("includeArchived", "true");

  return queryParams.toString();
}

/**
 * GET /user-types con filtros/orden/paginación server-side.
 * Con pageSize > 0 el backend responde el envelope { entities, pagination }
 * (ver PaginationResponse.java); úsese pageSize > 0 siempre desde este método
 * para obtener una forma predecible (la lista completa legacy sigue disponible
 * vía `getUserTypes`).
 */
async function getUserTypesPage(
  params: GetUserTypesPageParams = {},
): Promise<PaginatedUserTypesResponse> {
  const queryString = buildUserTypesPageQuery(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedUserTypesResponse>(url);
  // en error HTTP, response.data es el body de error del backend y NO debe devolverse.
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    const envelope = response.data as unknown as PaginatedUserTypesResponse;
    return {
      entities: (envelope.entities ?? []).map(normalizeArchived),
      pagination: envelope.pagination,
    };
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al obtener los tipos de usuario",
  );
}

export const userTypesService = {
  getUserTypes,
  getUserTypesPage,
};
