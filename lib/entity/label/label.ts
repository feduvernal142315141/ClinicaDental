/**
 * Label Entity Types
 */

export interface Label {
  id: string;
  name: string;
  color: string; // hex e.g. "#FF5733"
  description?: string;
  icon?: string;
  clinicId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface LabelSummary {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface CreateLabelDto {
  name: string;
  color: string;
  description?: string;
  icon?: string;
}

export interface UpdateLabelDto {
  name?: string;
  color?: string;
  description?: string;
  icon?: string;
}

export interface AssignLabelsDto {
  labelIds: string[];
}

/**
 * Backend pagination structure (envelope cuando pageSize > 0).
 * Ver domain/models/Pagination.java — patrón espejo de PaginatedDoctorsResponse.
 */
export interface LabelsPagination {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Envelope paginado de /labels cuando pageSize > 0.
 * Con pageSize = 0 (u omitido) el backend mantiene el comportamiento legacy
 * de lista completa (`Label[]`) — ver `labelsService.getLabels`.
 */
export interface PaginatedLabelsResponse {
  entities: Label[];
  pagination: LabelsPagination;
}

/**
 * Parámetros para `labelsService.getLabelsPage` (GET /labels con filtros
 * estructurados campo__OPERADOR__valor, orden y paginación server-side).
 */
export interface GetLabelsPageParams {
  /** Texto libre; se mapea a filters=name__CONTAINS_IGNORE_CASE__<query> */
  query?: string;
  /** Igual semántica que `getLabels(includeArchived)` (compat) */
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}
