import { serviceGet } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type { ClinicBranding } from "@/lib/entity/settings";

const endpoint = "/clinic/branding";

function unwrapResponse<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

let cachedBranding: ClinicBranding | null = null;
let inFlightRequest: Promise<ClinicBranding> | null = null;
let cacheEpoch = 0;

function invalidateCache() {
  cachedBranding = null;
  inFlightRequest = null;
  cacheEpoch += 1;
}

/**
 * Marca de la clínica (nombre + logo). Endpoint PÚBLICO: no requiere sesión
 * porque el login lo consume antes de autenticarse.
 */
async function fetchClinicBranding(): Promise<ClinicBranding> {
  const epoch = cacheEpoch;
  const response = await serviceGet<ClinicBranding>(endpoint);
  if (response?.status === 200) {
    const data = unwrapResponse<ClinicBranding>(response.data);
    if (epoch === cacheEpoch) {
      cachedBranding = data;
    }
    return data;
  }

  handleServiceError(response, "Error al cargar la marca de la clínica");
}

async function getClinicBranding(options?: {
  force?: boolean;
}): Promise<ClinicBranding> {
  if (options?.force) {
    invalidateCache();
  } else {
    if (cachedBranding) return cachedBranding;
    if (inFlightRequest) return inFlightRequest;
  }

  const request = fetchClinicBranding();
  inFlightRequest = request;

  try {
    return await request;
  } finally {
    if (inFlightRequest === request) {
      inFlightRequest = null;
    }
  }
}

function getCachedBranding(): ClinicBranding | null {
  return cachedBranding;
}

export const clinicBrandingService = {
  getClinicBranding,
  getCachedBranding,
  clearCache: invalidateCache,
};
