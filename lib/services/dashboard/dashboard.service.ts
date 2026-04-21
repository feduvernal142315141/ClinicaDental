import { serviceGet } from "@/lib/services/baseService";
import { DashboardSummary } from "@/lib/entity/dashboard";
import { handleServiceError } from "@/lib/utils/error.utils";

const DASHBOARD_ENDPOINTS = {
  SUMMARY: "/dashboard/summary",
};

export interface DashboardSummaryParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export async function getDashboardSummary(
  params?: DashboardSummaryParams,
): Promise<DashboardSummary> {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append("from", params.from);
  if (params?.to) queryParams.append("to", params.to);

  const qs = queryParams.toString();
  const url = qs
    ? `${DASHBOARD_ENDPOINTS.SUMMARY}?${qs}`
    : DASHBOARD_ENDPOINTS.SUMMARY;

  const response = await serviceGet<DashboardSummary>(url);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as DashboardSummary;
  }

  handleServiceError(response, "Error al cargar resumen del dashboard");
}
