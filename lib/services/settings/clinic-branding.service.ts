import { serviceGet } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type { ClinicBranding } from "@/lib/entity/settings";

const endpoint = "/clinic/branding";

function unwrapResponse<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

/**
 * Marca de la clínica (nombre + logo). Endpoint PÚBLICO: no requiere sesión
 * porque el login lo consume antes de autenticarse.
 */
async function getClinicBranding(): Promise<ClinicBranding> {
  const response = await serviceGet<ClinicBranding>(endpoint);
  if (response?.status === 200) {
    return unwrapResponse<ClinicBranding>(response.data);
  }

  handleServiceError(response, "Error al cargar la marca de la clínica");
}

export const clinicBrandingService = {
  getClinicBranding,
};
