import { serviceGet } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import { growthRequest } from "./growth-http";
import type {
  GrowthDashboardResponse,
  GrowthCampaignDetailAnalytics,
  GrowthCampaignConversionsResponse,
} from "@/lib/entity/growth";

const ENDPOINTS = {
  SUMMARY: "/growth/analytics/summary",
  CAMPAIGNS: "/growth/analytics/campaigns",
  CONVERSIONS: (id: string) => `/growth/campaigns/${id}/conversions`,
};

export interface GrowthAnalyticsParams {
  from?: string;
  to?: string;
}

export async function getGrowthAnalyticsSummary(
  params?: GrowthAnalyticsParams,
): Promise<GrowthDashboardResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.append("from", params.from);
  if (params?.to) qs.append("to", params.to);

  const query = qs.toString();
  const url = query ? `${ENDPOINTS.SUMMARY}?${query}` : ENDPOINTS.SUMMARY;

  const response = await serviceGet<GrowthDashboardResponse>(url);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as GrowthDashboardResponse;
  }

  handleServiceError(response, "Error al cargar el resumen de Growth");
}

export async function getGrowthCampaignDetailAnalytics(
  id: string,
): Promise<GrowthCampaignDetailAnalytics> {
  const response = await serviceGet<GrowthCampaignDetailAnalytics>(
    `${ENDPOINTS.CAMPAIGNS}/${id}`,
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as GrowthCampaignDetailAnalytics;
  }

  handleServiceError(
    response,
    "Error al cargar analíticas de la campaña",
  );
}

export function getGrowthCampaignConversions(
  campaignId: string,
): Promise<GrowthCampaignConversionsResponse> {
  return growthRequest("GET", ENDPOINTS.CONVERSIONS(campaignId), "Error al cargar conversiones de la campaña");
}
