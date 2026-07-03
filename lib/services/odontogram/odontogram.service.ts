import { serviceGet, servicePut } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  SaveOdontogramRequest,
  OdontogramResponse,
  OdontogramVisitSnapshot,
  OdontogramVisitSnapshots,
  PaginatedOdontogramHistoryResponse,
  PaginatedQueryParams,
} from "@/lib/entity/odontogram";

/**
 * OdontogramService
 *
 * Service layer for odontogram CRUD operations.
 * Base endpoint: /odontograms
 *
 * Authentication: Bearer Token
 * Required permission: odontogram
 */
const endpoint = "/odontograms";

/**
 * Build query string from paginated params.
 * Supports filters, orders, page and pageSize as per backend spec.
 */
function buildQueryString(params?: PaginatedQueryParams): string {
  if (!params) return "";

  const qp = new URLSearchParams();

  if (params.page !== undefined) qp.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    qp.append("pageSize", params.pageSize.toString());

  if (params.filters?.length) {
    params.filters.forEach((f) => qp.append("filters", f));
  }

  if (params.orders?.length) {
    params.orders.forEach((o) => qp.append("orders", o));
  }

  return qp.toString();
}

/**
 * Save (upsert) the full odontogram state.
 * PUT /odontograms
 *
 * The backend inserts an immutable snapshot in odontogram_history and upserts
 * the current state in patient_odontograms — all inside a single transaction.
 *
 * @returns true on success
 */
async function saveOdontogram(data: SaveOdontogramRequest): Promise<boolean> {
  const response = await servicePut<SaveOdontogramRequest, boolean>(
    endpoint,
    data,
  );

  if (response?.status === 200 && response?.data === true) {
    return true;
  }

  handleServiceError(response, "Error al guardar el odontograma");
}

/**
 * Get the current (live) odontogram for a patient.
 * GET /odontograms/patient/{patientId}
 *
 * @returns OdontogramResponse or null when the patient has no odontogram yet.
 */
async function getOdontogram(
  patientId: string,
): Promise<OdontogramResponse | null> {
  const response = await serviceGet<OdontogramResponse | null>(
    `${endpoint}/patient/${patientId}`,
  );

  if (response?.status === 200) {
    return response.data ?? null;
  }

  handleServiceError(response, "Error al cargar el odontograma");
}

/**
 * Get paginated history snapshots for a patient's odontogram.
 * GET /odontograms/patient/{patientId}/history
 */
async function getOdontogramHistory(
  patientId: string,
  params?: PaginatedQueryParams,
): Promise<PaginatedOdontogramHistoryResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/patient/${patientId}/history${qs ? `?${qs}` : ""}`;

  const response =
    await serviceGet<PaginatedOdontogramHistoryResponse>(url);

  if (response?.data) {
    return response.data;
  }

  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar el historial del odontograma");
}

/**
 * Get odontogram snapshot for a specific visit.
 * GET /odontograms/visit/{visitId}
 *
 * @returns OdontogramVisitSnapshot or null when not found (404).
 */
async function getOdontogramByVisit(
  visitId: string,
): Promise<OdontogramVisitSnapshot | null> {
  const response = await serviceGet<OdontogramVisitSnapshot | null>(
    `${endpoint}/visit/${visitId}`,
  );

  if (response?.status === 404) {
    return null;
  }

  if (response?.status === 200) {
    return response.data ?? null;
  }

  handleServiceError(response, "Error al cargar el odontograma de la visita");
}

/**
 * Get the start + final odontogram snapshots for a specific visit.
 * GET /odontograms/visit/{visitId}/snapshots
 *
 * Used to render the before/after comparison in the clinical history.
 * Either side may be null. Returns an all-null pair on transient failure so the
 * caller can degrade gracefully (the comparison is non-critical).
 */
async function getOdontogramVisitSnapshots(
  visitId: string,
): Promise<OdontogramVisitSnapshots> {
  const response = await serviceGet<OdontogramVisitSnapshots>(
    `${endpoint}/visit/${visitId}/snapshots`,
  );

  if (response?.status === 200 && response?.data) {
    return {
      start: response.data.start ?? null,
      finalSnapshot: response.data.finalSnapshot ?? null,
    };
  }

  if (response?.status === 404) {
    return { start: null, finalSnapshot: null };
  }

  handleServiceError(
    response,
    "Error al cargar el comparativo del odontograma",
  );
}

export const odontogramService = {
  saveOdontogram,
  getOdontogram,
  getOdontogramHistory,
  getOdontogramByVisit,
  getOdontogramVisitSnapshots,
};
