/**
 * Odontogram Entity Types
 *
 * Type definitions for odontogram and treatment-plan API endpoints.
 * Based on backend REST contract (see docs/ODONTOGRAM_API.md).
 */

// ─── Shared / Pagination ────────────────────────────────────────────

/** Reusable pagination shape returned by paginated endpoints. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/** Standard backend error shape. */
export interface ApiError {
  code: number;
  message: string;
  details?: string;
}

/** Query params accepted by paginated endpoints (history, treatment-plans). */
export interface PaginatedQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

// ─── Odontogram ─────────────────────────────────────────────────────

/**
 * PUT /odontograms — request body.
 * `state` is a **JSON string** containing `{ teeth, clinicalEvents }`.
 */
export interface SaveOdontogramRequest {
  patientId: string;
  visitId?: string | null;
  authorId: string;
  clinicId: string;
  version: number;
  state: string; // JSON.stringify({ teeth, clinicalEvents })
}

/**
 * GET /odontograms/patient/{patientId} — response body.
 * Returns `null` when the patient has no odontogram yet.
 */
export interface OdontogramResponse {
  id: string;
  patientId: string;
  version: number;
  state: string; // JSON string
  updatedAt: string; // ISO-8601
}

/**
 * Single entry returned by the history endpoint.
 * GET /odontograms/patient/{patientId}/history
 */
export interface OdontogramHistoryEntry {
  id: string;
  patientId: string;
  visitId?: string | null;
  authorId: string;
  clinicId: string;
  version: number;
  state: string; // JSON string
  createdAt: string; // ISO-8601
}

/** Paginated response for odontogram history. */
export interface PaginatedOdontogramHistoryResponse {
  entities: OdontogramHistoryEntry[];
  pagination: Pagination;
}

// ─── Treatment Plans ────────────────────────────────────────────────

/** Valid statuses for a treatment plan. */
export type PlanStatus = "active" | "completed" | "cancelled";

/**
 * POST /treatment-plans — request body.
 * `eventIds` is a **JSON string** containing an array of UUID strings.
 */
export interface CreateTreatmentPlanRequest {
  patientId: string;
  name: string;
  description?: string;
  totalPrice?: number;
  eventIds?: string; // JSON string: '["uuid-1","uuid-2"]'
}

/**
 * PUT /treatment-plans — request body.
 * `eventIds` is a **JSON string** containing an array of UUID strings.
 */
export interface UpdateTreatmentPlanRequest {
  id: string;
  name: string;
  description?: string;
  status?: PlanStatus;
  totalPrice?: number;
  eventIds?: string; // JSON string: '["uuid-1","uuid-2"]'
}

/**
 * Response shape for a single treatment plan.
 * GET /treatment-plans/{id}
 * Items inside GET /treatment-plans/patient/{patientId}
 */
export interface TreatmentPlanResponse {
  id: string;
  patientId: string;
  name: string;
  description?: string;
  status: PlanStatus;
  totalPrice?: number;
  eventIds: string; // JSON string array
  createdAt: string;
  updatedAt: string;
  active: boolean;
  /**
   * Referencia opcional al diagnóstico (CIE-10 dental) que originó el plan.
   * Forward-compatible: el backend puede no poblarla todavía; cuando está
   * presente, la historia clínica la muestra junto al plan.
   */
  linkedDiagnosis?: TreatmentPlanDiagnosisRef;
}

/** Referencia de diagnóstico vinculada a un plan de tratamiento. */
export interface TreatmentPlanDiagnosisRef {
  code: string;
  label: string;
  /** Diente FDI (11-48) asociado al diagnóstico, si aplica. */
  toothFdi?: string;
}

/** Paginated response for treatment plans. */
export interface PaginatedTreatmentPlansResponse {
  entities: TreatmentPlanResponse[];
  pagination: Pagination;
}

// ─── Service Templates / ICDAS Suggestions ──────────────────────────

/** A single service within a template, as returned by the suggest endpoint. */
export interface ServiceTemplateItemDetail {
  id: string;
  serviceId: string;
  itemOrder: number;
  dependsOnIds?: string;
}

/**
 * One suggestion returned by GET /service-templates/suggest.
 * Contains the template metadata plus the ordered list of service items.
 */
export interface IcdasTemplateSuggestion {
  templateId: string;
  templateCode: string;
  templateName: string;
  templateDescription?: string;
  priority: number;
  icdasFrom: number;
  icdasTo: number;
  items: ServiceTemplateItemDetail[];
}

/** Entry from GET /service-templates (paginated list). */
export interface ServiceTemplateResponse {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  active: boolean;
  createAt?: string;
}

/** Paginated response for service templates list. */
export interface PaginatedServiceTemplatesResponse {
  entities: ServiceTemplateResponse[];
  pagination: Pagination;
}

/** Enriched item returned by GET /service-templates/{id}. */
export interface ServiceTemplateItemEnriched {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCost?: number;
  serviceDuration?: number;
  itemOrder: number;
  dependsOnIds?: string;
}

// ─── Odontogram Visit Snapshot ─────────────────────────────────────────────

/**
 * Snapshot of an odontogram tied to a specific visit/appointment.
 * GET /odontograms/visit/{visitId}
 */
export interface OdontogramVisitSnapshot {
  id: string;
  patientId: string;
  visitId: string;
  state: string; // JSON string of the odontogram snapshot
  createdAt: string; // ISO-8601
  authorId?: string;
  /** Tipo de snapshot dentro de la visita: 'start' | 'final'. */
  snapshotType?: "start" | "final";
}

/**
 * Comparativo antes/después del odontograma de una visita.
 * GET /odontograms/visit/{visitId}/snapshots
 * Cualquiera de los dos puede ser `null` (consultas previas a la captura 'start',
 * o visitas sin odontograma guardado).
 */
export interface OdontogramVisitSnapshots {
  start: OdontogramVisitSnapshot | null;
  finalSnapshot: OdontogramVisitSnapshot | null;
}

/** Detailed response from GET /service-templates/{id}. */
export interface ServiceTemplateDetailResponse {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  active: boolean;
  createAt?: string;
  items: ServiceTemplateItemEnriched[];
}
