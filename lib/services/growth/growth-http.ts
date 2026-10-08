import type { AxiosRequestConfig, Method } from "axios";
import apiInstance from "@/lib/services/apiConfig";
import { emitLeadModuleDisabled } from "@/lib/services/leads/leads-errors";
import { toGrowthError } from "./growth-errors";

/**
 * HTTP client of Segments and Campaigns.
 *
 * - Always throws `GrowthApiError`, which keeps the backend `errorCode`.
 * - Handles its own 403 (`skipForbiddenHandler`): "module not enabled" tells the app to refresh
 *   the clinic capabilities (the prospects audience disappears); a missing permission is shown
 *   by the screen with the backend message.
 * - Never sends `clinicId`: the clinic comes from the session.
 */
export async function growthRequest<T>(
  method: Method,
  url: string,
  fallbackMessage: string,
  data?: unknown,
): Promise<T> {
  const config: AxiosRequestConfig & { skipForbiddenHandler: boolean; expectedStatuses: number[] } = {
    method,
    url,
    data,
    skipForbiddenHandler: true,
    expectedStatuses: [400, 403, 422],
  };

  try {
    const response = await apiInstance.request<T>(config);
    return response.data;
  } catch (err) {
    const response = (err as { response?: { status?: number; data?: unknown } }).response;
    const error = toGrowthError(response?.status, response?.data, fallbackMessage);
    if (error.errorCode === "MODULE_NOT_ENABLED") emitLeadModuleDisabled();
    throw error;
  }
}
