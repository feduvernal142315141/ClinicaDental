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

let cachedSettings: ClinicGeneralSettings | null = null;
let inFlightRequest: Promise<ClinicGeneralSettings> | null = null;
let cacheEpoch = 0;

function invalidateCache() {
  cachedSettings = null;
  inFlightRequest = null;
  cacheEpoch += 1;
}

async function fetchGeneralSettings(): Promise<ClinicGeneralSettings> {
  const epoch = cacheEpoch;
  const response = await serviceGet<ClinicGeneralSettings>(endpoint);
  if (response?.status === 200) {
    const data = unwrapResponse<ClinicGeneralSettings>(response.data);
    if (epoch === cacheEpoch) {
      cachedSettings = data;
    }
    return data;
  }

  handleServiceError(response, "Error al cargar la configuración general");
}

function getCachedGeneralSettings(): ClinicGeneralSettings | null {
  return cachedSettings;
}

async function getGeneralSettings(options?: {
  force?: boolean;
}): Promise<ClinicGeneralSettings> {
  if (options?.force) {
    invalidateCache();
  } else {
    if (cachedSettings) return cachedSettings;
    if (inFlightRequest) return inFlightRequest;
  }

  const request = fetchGeneralSettings();
  inFlightRequest = request;

  try {
    return await request;
  } finally {
    if (inFlightRequest === request) {
      inFlightRequest = null;
    }
  }
}

async function updateGeneralSettings(
  data: UpdateClinicGeneralSettingsRequest,
): Promise<boolean> {
  const response = await servicePut<UpdateClinicGeneralSettingsRequest, boolean>(
    endpoint,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) {
    invalidateCache();
    return true;
  }

  handleServiceError(response, "Error al guardar la configuración general");
}

export const clinicGeneralSettingsService = {
  getGeneralSettings,
  getCachedGeneralSettings,
  updateGeneralSettings,
  clearCache: invalidateCache,
};
