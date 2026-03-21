import { serviceGet, servicePut } from "../baseService";
import type {
  SaveOdontogramRequest,
  OdontogramResponse,
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

  const errorMessage =
    response?.data?.message ||
    response?.data?.details ||
    "Error al guardar el odontograma";
  throw new Error(errorMessage);
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

  const errorMessage =
    response?.data?.message ??
    (response?.data as unknown as { details?: string })?.details ??
    "Error al cargar el odontograma";
  throw new Error(errorMessage);
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

  throw new Error("Error al cargar el historial del odontograma");
}

export const odontogramService = {
  saveOdontogram,
  getOdontogram,
  getOdontogramHistory,
};
