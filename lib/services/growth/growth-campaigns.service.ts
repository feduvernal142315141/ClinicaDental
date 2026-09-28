import {
  serviceGet,
  servicePost,
  servicePut,
} from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  GrowthCampaign,
  GrowthCampaignListResponse,
  GrowthCampaignQueryParams,
  CreateGrowthCampaignRequest,
  UpdateGrowthCampaignRequest,
} from "@/lib/entity/growth";

const ENDPOINT = "/growth/campaigns";

function buildQueryString(query?: GrowthCampaignQueryParams): string {
  if (!query) return "";

  const params = new URLSearchParams();
  if (query.page !== undefined) params.append("page", String(query.page));
  if (query.pageSize !== undefined)
    params.append("pageSize", String(query.pageSize));
  if (query.filters) {
    query.filters.forEach((f) => params.append("filters", f));
  }
  if (query.orders) {
    query.orders.forEach((o) => params.append("orders", o));
  }

  return params.toString();
}

export async function getGrowthCampaigns(
  query?: GrowthCampaignQueryParams,
): Promise<GrowthCampaignListResponse> {
  const qs = buildQueryString(query);
  const url = qs ? `${ENDPOINT}?${qs}` : ENDPOINT;

  const response = await serviceGet<GrowthCampaignListResponse>(url);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as GrowthCampaignListResponse;
  }

  handleServiceError(response, "Error al cargar las campañas de Growth");
}

export async function getGrowthCampaignById(
  id: string,
): Promise<GrowthCampaign> {
  const response = await serviceGet<GrowthCampaign>(`${ENDPOINT}/${id}`);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as GrowthCampaign;
  }

  handleServiceError(response, "Error al cargar la campaña");
}

export async function createGrowthCampaign(
  data: CreateGrowthCampaignRequest,
): Promise<string> {
  const response = await servicePost<CreateGrowthCampaignRequest, string>(
    ENDPOINT,
    data,
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as string;
  }

  handleServiceError(response, "Error al crear la campaña");
}

export async function updateGrowthCampaign(
  id: string,
  data: UpdateGrowthCampaignRequest,
): Promise<void> {
  const response = await servicePut<UpdateGrowthCampaignRequest, boolean>(
    `${ENDPOINT}/${id}`,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al actualizar la campaña");
}

// ── Lifecycle actions ───────────────────────────────────────────────────────
// Backend: schedule, send-now, pause, resume all take NO request body.
// scheduledAt is set at create/update time.

export async function scheduleGrowthCampaign(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${ENDPOINT}/${id}/schedule`,
    {},
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al programar la campaña");
}

export async function sendGrowthCampaignNow(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${ENDPOINT}/${id}/send-now`,
    {},
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al enviar la campaña");
}

export async function pauseGrowthCampaign(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${ENDPOINT}/${id}/pause`,
    {},
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al pausar la campaña");
}

export async function resumeGrowthCampaign(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${ENDPOINT}/${id}/resume`,
    {},
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al reanudar la campaña");
}

export async function cancelGrowthCampaign(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${ENDPOINT}/${id}/cancel`,
    {},
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al cancelar la campaña");
}
