import {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
} from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  ReminderConfigResponse,
  CreateReminderConfigRequest,
  UpdateReminderConfigRequest,
} from "@/lib/entity/settings";

const endpoint = "/clinic/reminder-config";

function unwrapResponse<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

async function getReminderConfigs(): Promise<ReminderConfigResponse[]> {
  const response = await serviceGet<ReminderConfigResponse[]>(endpoint);
  if (response?.status === 200) {
    const data = unwrapResponse<ReminderConfigResponse[]>(response.data);
    return Array.isArray(data) ? data : [];
  }

  handleServiceError(
    response,
    "Error al cargar la configuración de recordatorios"
  );
  return [];
}

async function getReminderConfigById(id: string): Promise<ReminderConfigResponse | null> {
  const response = await serviceGet<ReminderConfigResponse>(
    `${endpoint}/${id}`
  );
  if (response?.status === 200) {
    return unwrapResponse<ReminderConfigResponse>(response.data);
  }

  handleServiceError(response, "Error al cargar la configuración");
  return null;
}

async function createReminderConfig(
  data: CreateReminderConfigRequest
): Promise<string | null> {
  const response = await servicePost<CreateReminderConfigRequest, string>(
    endpoint,
    data
  );

  if (response?.status === 201) {
    return unwrapResponse<string>(response.data);
  }

  handleServiceError(response, "Error al crear la configuración");
  return null;
}

async function updateReminderConfig(
  id: string,
  data: UpdateReminderConfigRequest
): Promise<boolean> {
  const response = await servicePut<UpdateReminderConfigRequest, void>(
    `${endpoint}/${id}`,
    data
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al actualizar la configuración");
  return false;
}

async function deleteReminderConfig(id: string): Promise<boolean> {
  const response = await serviceDelete<void, void>(`${endpoint}/${id}`);

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al eliminar la configuración");
  return false;
}

export const reminderConfigService = {
  getReminderConfigs,
  getReminderConfigById,
  createReminderConfig,
  updateReminderConfig,
  deleteReminderConfig,
};
