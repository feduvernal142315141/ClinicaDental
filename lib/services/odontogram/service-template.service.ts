import { serviceGet } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import { notifyApiError } from "@/lib/utils/notify-error";
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
  const params = new URLSearchParams({ icdasScore: icdasScore.toString() });
  if (surface) params.append("surface", surface);

  const result = await serviceGet<IcdasTemplateSuggestion[]>(
    `${endpoint}/suggest?${params.toString()}`,
  );

  if (
    result &&
    typeof result.status === "number" &&
    result.status >= 200 &&
    result.status < 300
  ) {
    return Array.isArray(result.data) ? result.data : [];
  }

  // serviceGet nunca rechaza: un 401/403/500 llega como respuesta resuelta.
  // Lanzar el Error saneado (y avisar al usuario) en vez de degradar a []
  // como si no existieran plantillas.
  try {
    handleServiceError(
      result ?? null,
      "No se pudieron cargar las plantillas ICDAS",
    );
  } catch (err) {
    notifyApiError("No se pudieron cargar las plantillas ICDAS", err);
    throw err;
  }
}

/**
 * Get paginated list of service templates.
 * GET /service-templates
 */
async function getServiceTemplates(
  params?: PaginatedQueryParams,
): Promise<PaginatedServiceTemplatesResponse | null> {
  const qp = new URLSearchParams();
  if (params?.page !== undefined) qp.append("page", params.page.toString());
  if (params?.pageSize !== undefined)
    qp.append("pageSize", params.pageSize.toString());

  const qs = qp.toString();
  const result = await serviceGet<PaginatedServiceTemplatesResponse>(
    qs ? `${endpoint}?${qs}` : endpoint,
  );

  // `serviceGet` devuelve la AxiosResponse COMPLETA y nunca rechaza: un 403 o
  // un 500 llegan como respuesta resuelta con `.data` = cuerpo de error. Antes
  // esta función devolvía `result` tal cual, así que quien la llamara leería
  // `result.entities` = undefined y vería "no hay plantillas" tanto si no las
  // hay como si el backend está caído. Lo delataba `tsc`, pero el error vivía
  // en la baseline porque la función no tenía consumidores.
  if (
    result &&
    typeof result.status === "number" &&
    result.status >= 200 &&
    result.status < 300
  ) {
    return result.data ?? null;
  }

  handleServiceError(
    result ?? null,
    "No se pudieron cargar las plantillas de tratamiento",
  );
}

/**
 * Get service template detail with enriched items.
 * GET /service-templates/{id}
 */
async function getServiceTemplateById(
  id: string,
): Promise<ServiceTemplateDetailResponse | null> {
  const result = await serviceGet<ServiceTemplateDetailResponse>(
    `${endpoint}/${id}`,
  );

  // Mismo motivo que en getServiceTemplates: sin comprobar el status, un 403
  // devolvía un cuerpo de error cuyo `.items` es undefined, y aplicar la
  // plantilla se convertía en un no-op absolutamente silencioso.
  if (
    result &&
    typeof result.status === "number" &&
    result.status >= 200 &&
    result.status < 300
  ) {
    return result.data ?? null;
  }

  handleServiceError(result ?? null, "No se pudo cargar la plantilla");
}

export const ServiceTemplateService = {
  getIcdasSuggestions,
  getServiceTemplates,
  getServiceTemplateById,
};
