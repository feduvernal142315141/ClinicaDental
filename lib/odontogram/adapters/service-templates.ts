"use client";

import { ServiceTemplateService } from "@/lib/services/odontogram/service-template.service";
import type { ServiceTemplateItemEnriched } from "@/lib/entity/odontogram";

/**
 * Adapter de plantillas de servicios (los bloques "Plantillas" del tab Plan).
 *
 * Sustituye al mock `procedure-templates.mock.ts`, cuyos pasos referenciaban
 * procedimientos por slug (`"endo-unirradicular"`) mientras los servicios
 * reales se identifican por UUID. La consecuencia era que al aplicar una
 * plantilla el `find` contra el catálogo real NUNCA acertaba y siempre caía al
 * catálogo mock, metiendo precios de demostración en el plan del paciente.
 *
 * Como en `service-catalog.ts`, es un adapter porque `lib/odontogram/*` solo
 * puede alcanzar `lib/services/*` desde aquí.
 */

/** Plantilla tal como la pinta el panel: metadatos, sin pasos. */
export interface ServiceTemplateSummary {
  id: string;
  name: string;
  description: string;
}

/** Un paso de plantilla ya resuelto contra el catálogo del backend. */
export interface ServiceTemplateStep {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  serviceCost?: number;
  serviceDuration?: number;
  order: number;
  dependsOn?: string[];
}

/**
 * Lista las plantillas activas de la clínica.
 *
 * El listado del backend no filtra por `active`, así que se filtra aquí para
 * no ofrecer plantillas retiradas.
 */
export async function fetchServiceTemplates(): Promise<
  ServiceTemplateSummary[]
> {
  const response = await ServiceTemplateService.getServiceTemplates();
  return (response?.entities ?? [])
    .filter((t) => t.active !== false)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
    }));
}

/**
 * `dependsOnIds` viaja como cadena (una o varias ids separadas por coma).
 * Se normaliza a array; una cadena vacía no es una dependencia.
 */
function parseDependsOn(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

function toStep(item: ServiceTemplateItemEnriched): ServiceTemplateStep {
  return {
    serviceId: item.serviceId,
    serviceName: item.serviceName,
    serviceCode: item.serviceCode,
    serviceCost: item.serviceCost,
    serviceDuration: item.serviceDuration,
    order: item.itemOrder,
    dependsOn: parseDependsOn(item.dependsOnIds),
  };
}

/**
 * Trae los pasos de una plantilla, ya enriquecidos por el backend con nombre,
 * código, coste y duración del servicio.
 *
 * Se pide bajo demanda (al pulsar la plantilla) y no en el listado porque el
 * endpoint de lista solo devuelve metadatos: así se evita un N+1 al abrir el
 * panel, a cambio de una petición en una acción que el usuario ya inició.
 */
export async function fetchServiceTemplateSteps(
  templateId: string,
): Promise<ServiceTemplateStep[]> {
  const detail = await ServiceTemplateService.getServiceTemplateById(templateId);
  return (detail?.items ?? []).map(toStep).sort((a, b) => a.order - b.order);
}
