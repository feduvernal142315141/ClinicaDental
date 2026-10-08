import type {
  GrowthCampaign,
  GrowthCampaignListResponse,
  GrowthCampaignMessagesResponse,
  GrowthCampaignQueryParams,
  CreateGrowthCampaignRequest,
  UpdateGrowthCampaignRequest,
} from "@/lib/entity/growth";
import { growthRequest } from "./growth-http";

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

export function getGrowthCampaigns(query?: GrowthCampaignQueryParams): Promise<GrowthCampaignListResponse> {
  const qs = buildQueryString(query);
  return growthRequest("GET", qs ? `${ENDPOINT}?${qs}` : ENDPOINT, "Error al cargar las campañas de Growth");
}

export function getGrowthCampaignById(id: string): Promise<GrowthCampaign> {
  return growthRequest("GET", `${ENDPOINT}/${id}`, "Error al cargar la campaña");
}

/** Recipients of a campaign, with their delivery status and why any was skipped. */
export function getGrowthCampaignMessages(
  id: string,
  query?: GrowthCampaignQueryParams,
): Promise<GrowthCampaignMessagesResponse> {
  const qs = buildQueryString(query);
  const url = `${ENDPOINT}/${id}/messages`;
  return growthRequest("GET", qs ? `${url}?${qs}` : url, "Error al cargar los destinatarios");
}

export function createGrowthCampaign(data: CreateGrowthCampaignRequest): Promise<string> {
  return growthRequest("POST", ENDPOINT, "Error al crear la campaña", data);
}

export async function updateGrowthCampaign(id: string, data: UpdateGrowthCampaignRequest): Promise<void> {
  await growthRequest("PUT", `${ENDPOINT}/${id}`, "Error al actualizar la campaña", data);
}

// ── Lifecycle actions ───────────────────────────────────────────────────────
// Backend: schedule, send-now, pause, resume all take NO request body.
// scheduledAt is set at create/update time.

export async function scheduleGrowthCampaign(id: string): Promise<void> {
  await growthRequest("POST", `${ENDPOINT}/${id}/schedule`, "Error al programar la campaña", {});
}

export async function sendGrowthCampaignNow(id: string): Promise<void> {
  await growthRequest("POST", `${ENDPOINT}/${id}/send-now`, "Error al enviar la campaña", {});
}

export async function pauseGrowthCampaign(id: string): Promise<void> {
  await growthRequest("POST", `${ENDPOINT}/${id}/pause`, "Error al pausar la campaña", {});
}

export async function resumeGrowthCampaign(id: string): Promise<void> {
  await growthRequest("POST", `${ENDPOINT}/${id}/resume`, "Error al reanudar la campaña", {});
}

export async function cancelGrowthCampaign(id: string): Promise<void> {
  await growthRequest("POST", `${ENDPOINT}/${id}/cancel`, "Error al cancelar la campaña", {});
}
