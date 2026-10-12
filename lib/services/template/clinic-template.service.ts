import {
  serviceGet,
  servicePost,
} from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  ClinicTemplate,
  MetaTemplateRepublishItem,
  MetaTemplateRepublishResult,
  MetaTemplateSyncResult,
} from "@/lib/entity/settings";

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
  category?: string;
  variables?: Array<{ id: string; placeholder: string; sampleContent: string; type: string }>;
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

async function syncMetaTemplates(): Promise<MetaTemplateSyncResult> {
  const response = await servicePost<Record<string, never>, MetaTemplateSyncResult>(
    `${endpoint}/sync-meta`, {}
  );
  if (response?.status === 200) return unwrapResponse<MetaTemplateSyncResult>(response.data);
  return handleServiceError(response, "No se pudieron sincronizar las plantillas de Meta");
}

function toRepublishItems(value: unknown): MetaTemplateRepublishItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      reason: String(item.reason ?? ""),
    }));
}

/**
 * Vuelve a crear en la cuenta ACTUAL de Meta las plantillas que la clínica
 * escribió en el panel. No es sincronizar: sincronizar solo trae lo que hay.
 */
async function republishMetaTemplates(): Promise<MetaTemplateRepublishResult> {
  const response = await servicePost<Record<string, never>, MetaTemplateRepublishResult>(
    `${endpoint}/republish-meta`, {}
  );
  if (response?.status === 200) {
    const data = unwrapResponse<Partial<MetaTemplateRepublishResult> | null>(response.data);
    return {
      republished: Number(data?.republished) || 0,
      alreadyInAccount: Number(data?.alreadyInAccount) || 0,
      skipped: toRepublishItems(data?.skipped),
      failed: toRepublishItems(data?.failed),
    };
  }
  return handleServiceError(response, "No se pudieron republicar las plantillas en Meta");
}

export const clinicTemplateService = {
  syncMetaTemplates,
  republishMetaTemplates,
  getClinicTemplates,
  getClinicTemplateById,
  createClinicTemplate,
};
