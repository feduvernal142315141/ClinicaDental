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
}

/** Paginated response for treatment plans. */
export interface PaginatedTreatmentPlansResponse {
  entities: TreatmentPlanResponse[];
  pagination: Pagination;
}
