import { serviceGet } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  IcdasTemplateSuggestion,
  PaginatedServiceTemplatesResponse,
  PaginatedQueryParams,
  ServiceTemplateDetailResponse,
} from "@/lib/entity/odontogram";

/**
 * ServiceTemplateService
 *
 * HTTP service for reading service templates and ICDAS-based suggestions.
 * Base endpoint: /service-templates
 *
 * Authentication: Bearer Token
 * Required permission: odontogram
 */
const endpoint = "/service-templates";

/**
 * Get ICDAS-based template suggestions for a given score and optional surface.
 * GET /service-templates/suggest?icdasScore={n}&surface={s}
 */
async function getIcdasSuggestions(
  icdasScore: number,
  surface?: string | null,
): Promise<IcdasTemplateSuggestion[]> {
  try {
    const params = new URLSearchParams({ icdasScore: icdasScore.toString() });
    if (surface) params.append("surface", surface);

    const result = await serviceGet<IcdasTemplateSuggestion[]>(
      `${endpoint}/suggest?${params.toString()}`,
    );
    return Array.isArray(result?.data) ? result.data : [];
  } catch (err) {
    handleServiceError(err, "getIcdasSuggestions");
    return [];
  }
}

/**
 * Get paginated list of service templates.
 * GET /service-templates
 */
async function getServiceTemplates(
  params?: PaginatedQueryParams,
): Promise<PaginatedServiceTemplatesResponse | null> {
  try {
    const qp = new URLSearchParams();
    if (params?.page !== undefined) qp.append("page", params.page.toString());
    if (params?.pageSize !== undefined)
      qp.append("pageSize", params.pageSize.toString());

    const qs = qp.toString();
    return await serviceGet<PaginatedServiceTemplatesResponse>(
      qs ? `${endpoint}?${qs}` : endpoint,
    );
  } catch (err) {
    handleServiceError(err, "getServiceTemplates");
    return null;
  }
}

/**
 * Get service template detail with enriched items.
 * GET /service-templates/{id}
 */
async function getServiceTemplateById(
  id: string,
): Promise<ServiceTemplateDetailResponse | null> {
  try {
    const result = await serviceGet<ServiceTemplateDetailResponse>(
      `${endpoint}/${id}`,
    );
    return result?.data ?? null;
  } catch (err) {
    handleServiceError(err, "getServiceTemplateById");
    return null;
  }
}

export const ServiceTemplateService = {
  getIcdasSuggestions,
  getServiceTemplates,
  getServiceTemplateById,
};
