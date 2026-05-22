import { serviceGet, servicePut } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  ClinicGeneralSettings,
  UpdateClinicGeneralSettingsRequest,
} from "@/lib/entity/settings";

const endpoint = "/clinic/general-settings";

function unwrapResponse<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

async function getGeneralSettings(): Promise<ClinicGeneralSettings> {
  const response = await serviceGet<ClinicGeneralSettings>(endpoint);
  if (response?.status === 200) {
    return unwrapResponse<ClinicGeneralSettings>(response.data);
  }

  handleServiceError(response, "Error al cargar la configuración general");
}

async function updateGeneralSettings(
  data: UpdateClinicGeneralSettingsRequest,
): Promise<boolean> {
  const response = await servicePut<UpdateClinicGeneralSettingsRequest, boolean>(
    endpoint,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al guardar la configuración general");
}

export const clinicGeneralSettingsService = {
  getGeneralSettings,
  updateGeneralSettings,
};
