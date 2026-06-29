/**
 * Labels Service
 */
import { serviceGet, servicePost, servicePut, servicePatch, serviceDelete } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type { Label, CreateLabelDto, UpdateLabelDto } from "@/lib/entity/label";

const endpoint = "/labels";

async function getLabels(includeArchived = false): Promise<Label[]> {
  const url = includeArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const response = await serviceGet<Label[]>(url);
  if (response?.status === 200) {
    const raw =
      (response.data as unknown as { data?: Label[] })?.data ??
      (response.data as unknown as Label[]) ??
      [];
    // El backend serializa el booleano como `archived` (campo Java `isArchived`
    // con getter Lombok `isArchived()` → Jackson quita el prefijo "is"). El resto
    // del frontend usa `isArchived`; normalizamos aceptando ambas claves para que
    // el estado archivado se refleje (sin esto, archivar "no se ve").
    return raw.map((l) => ({
      ...l,
      isArchived:
        (l as { isArchived?: boolean }).isArchived ??
        (l as { archived?: boolean }).archived ??
        false,
    }));
  }
  handleServiceError(response, "Error al obtener etiquetas");
  return [];
}

async function createLabel(data: CreateLabelDto): Promise<Label> {
  const response = await servicePost<CreateLabelDto, Label>(endpoint, data);
  if (response?.status === 201 || response?.status === 200) {
    return (response.data as unknown as { data?: Label })?.data ?? (response.data as unknown as Label);
  }
  handleServiceError(response, "Error al crear etiqueta");
  throw new Error("Error al crear etiqueta");
}

async function updateLabel(id: string, data: UpdateLabelDto): Promise<Label> {
  const response = await servicePut<UpdateLabelDto, Label>(`${endpoint}/${id}`, data);
  if (response?.status === 200) {
    return (response.data as unknown as { data?: Label })?.data ?? (response.data as unknown as Label);
  }
  handleServiceError(response, "Error al actualizar etiqueta");
  throw new Error("Error al actualizar etiqueta");
}

async function archiveLabel(id: string): Promise<void> {
  const response = await servicePatch(`${endpoint}/${id}/archive`);
  if (response?.status === 200 || response?.status === 204) return;
  handleServiceError(response, "Error al archivar etiqueta");
}

async function unarchiveLabel(id: string): Promise<void> {
  const response = await servicePatch(`${endpoint}/${id}/unarchive`);
  if (response?.status === 200 || response?.status === 204) return;
  handleServiceError(response, "Error al restaurar etiqueta");
}

async function assignLabels(appointmentId: string, labelIds: string[]): Promise<void> {
  const response = await servicePost<{ labelIds: string[] }, unknown>(
    `/appointments/${appointmentId}/labels`,
    { labelIds },
  );
  if (response?.status === 200 || response?.status === 201 || response?.status === 204) return;
  handleServiceError(response, "Error al asignar etiquetas");
}

async function removeLabel(appointmentId: string, labelId: string): Promise<void> {
  const response = await serviceDelete(`/appointments/${appointmentId}/labels/${labelId}`);
  if (response?.status === 200 || response?.status === 204) return;
  handleServiceError(response, "Error al remover etiqueta");
}

export const labelsService = {
  getLabels,
  createLabel,
  updateLabel,
  archiveLabel,
  unarchiveLabel,
  assignLabels,
  removeLabel,
};
