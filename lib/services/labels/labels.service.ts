/**
 * Labels Service
 */
import { serviceGet, servicePost, servicePut, servicePatch, serviceDelete } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  Label,
  CreateLabelDto,
  UpdateLabelDto,
  GetLabelsPageParams,
  PaginatedLabelsResponse,
} from "@/lib/entity/label";

const endpoint = "/labels";

// El backend serializa el booleano como `archived` (campo Java `isArchived`
// con getter Lombok `isArchived()` → Jackson quita el prefijo "is"). El resto
// del frontend usa `isArchived`; normalizamos aceptando ambas claves para que
// el estado archivado se refleje (sin esto, archivar "no se ve").
function normalizeArchived(l: Label): Label {
  return {
    ...l,
    isArchived:
      (l as { isArchived?: boolean }).isArchived ??
      (l as { archived?: boolean }).archived ??
      false,
  };
}

async function getLabels(includeArchived = false): Promise<Label[]> {
  const url = includeArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const response = await serviceGet<Label[]>(url);
  if (response?.status === 200) {
    const raw =
      (response.data as unknown as { data?: Label[] })?.data ??
      (response.data as unknown as Label[]) ??
      [];
    return raw.map(normalizeArchived);
  }
  handleServiceError(response, "Error al obtener etiquetas");
  return [];
}

/**
 * Build query string for GET /labels — filters/orders/page/pageSize/includeArchived,
 * mismo patrón que doctorsService.buildQueryString (separador canónico "__").
 */
function buildLabelsPageQuery(params: GetLabelsPageParams): string {
  const queryParams = new URLSearchParams();

  const query = params.query?.trim();
  if (query) {
    // CONTAINS_IGNORE_CASE (unaccent+lower server-side) para que la búsqueda
    // server coincida con matchesQuery del modo cliente (insensible a
    // mayúsculas y acentos); CONTAINS a secas es LIKE literal.
    queryParams.append("filters", `name__CONTAINS_IGNORE_CASE__${query}`);
  }
  queryParams.append("orders", "name__ASC");

  if (params.page !== undefined) queryParams.append("page", String(params.page));
  if (params.pageSize !== undefined) queryParams.append("pageSize", String(params.pageSize));
  if (params.includeArchived) queryParams.append("includeArchived", "true");

  return queryParams.toString();
}

/**
 * GET /labels con filtros/orden/paginación server-side.
 * Con pageSize > 0 el backend responde el envelope { entities, pagination }
 * (ver PaginationResponse.java); úsese pageSize > 0 siempre desde este método
 * para obtener una forma predecible (la lista completa legacy sigue disponible
 * vía `getLabels`).
 */
async function getLabelsPage(params: GetLabelsPageParams = {}): Promise<PaginatedLabelsResponse> {
  const queryString = buildLabelsPageQuery(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedLabelsResponse>(url);
  // en error HTTP, response.data es el body de error del backend y NO debe devolverse.
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    const envelope = response.data as unknown as PaginatedLabelsResponse;
    return {
      entities: (envelope.entities ?? []).map(normalizeArchived),
      pagination: envelope.pagination,
    };
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al obtener etiquetas");
}

async function createLabel(data: CreateLabelDto): Promise<Label> {
  const response = await servicePost<CreateLabelDto, Label>(endpoint, data);
  if (response?.status === 201 || response?.status === 200) {
    return (response.data as unknown as { data?: Label })?.data ?? (response.data as unknown as Label);
  }
  handleServiceError(response, "Error al crear etiqueta");
  throw new Error("Error al crear etiqueta");
}

async function updateLabel(id: string, data: UpdateLabelDto): Promise<Label> {
  const response = await servicePut<UpdateLabelDto, Label>(`${endpoint}/${id}`, data);
  if (response?.status === 200) {
    return (response.data as unknown as { data?: Label })?.data ?? (response.data as unknown as Label);
  }
  handleServiceError(response, "Error al actualizar etiqueta");
  throw new Error("Error al actualizar etiqueta");
}

async function archiveLabel(id: string): Promise<void> {
  const response = await servicePatch(`${endpoint}/${id}/archive`);
  if (response?.status === 200 || response?.status === 204) return;
  handleServiceError(response, "Error al archivar etiqueta");
}

async function unarchiveLabel(id: string): Promise<void> {
  const response = await servicePatch(`${endpoint}/${id}/unarchive`);
  if (response?.status === 200 || response?.status === 204) return;
  handleServiceError(response, "Error al restaurar etiqueta");
}

async function assignLabels(appointmentId: string, labelIds: string[]): Promise<void> {
  const response = await servicePost<{ labelIds: string[] }, unknown>(
    `/appointments/${appointmentId}/labels`,
    { labelIds },
  );
  if (response?.status === 200 || response?.status === 201 || response?.status === 204) return;
  handleServiceError(response, "Error al asignar etiquetas");
}

async function removeLabel(appointmentId: string, labelId: string): Promise<void> {
  const response = await serviceDelete(`/appointments/${appointmentId}/labels/${labelId}`);
  if (response?.status === 200 || response?.status === 204) return;
  handleServiceError(response, "Error al remover etiqueta");
}

export const labelsService = {
  getLabels,
  getLabelsPage,
  createLabel,
  updateLabel,
  archiveLabel,
  unarchiveLabel,
  assignLabels,
  removeLabel,
};
