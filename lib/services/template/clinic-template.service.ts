import {
  serviceGet,
  servicePost,
} from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type { ClinicTemplate } from "@/lib/entity/settings";

const endpoint = "/clinic-template";

function unwrapResponse<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

async function getClinicTemplates(): Promise<ClinicTemplate[]> {
  // GET /clinic-template/campaign-by-clinic devuelve PaginationResponse
  const response = await serviceGet<{
    entities?: ClinicTemplate[];
    content?: ClinicTemplate[];
  }>(`${endpoint}/campaign-by-clinic`);

  if (response?.status === 200) {
    const data = unwrapResponse<{
      entities?: ClinicTemplate[];
      content?: ClinicTemplate[];
    }>(response.data);
    // Algunos endpoints devuelven 'entities', otros 'content'
    const templates = data?.entities ?? data?.content ?? [];
    return Array.isArray(templates) ? templates : [];
  }

  handleServiceError(response, "Error al cargar las plantillas");
  return [];
}

async function getClinicTemplateById(
  id: string
): Promise<ClinicTemplate | null> {
  const response = await serviceGet<ClinicTemplate>(`${endpoint}/${id}`);
  if (response?.status === 200) {
    return unwrapResponse<ClinicTemplate>(response.data);
  }

  handleServiceError(response, "Error al cargar la plantilla");
  return null;
}

async function createClinicTemplate(payload: {
  name: string;
  body: string;
  type: string;
  variables?: string[];
}): Promise<string | null> {
  const response = await servicePost<typeof payload, string>(
    `${endpoint}/create-content-template`,
    payload
  );

  if (response?.status === 201) {
    return unwrapResponse<string>(response.data);
  }

  handleServiceError(response, "Error al crear la plantilla");
  return null;
}

export const clinicTemplateService = {
  getClinicTemplates,
  getClinicTemplateById,
  createClinicTemplate,
};
