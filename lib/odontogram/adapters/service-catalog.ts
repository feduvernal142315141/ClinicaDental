"use client";

import { servicesService } from "@/lib/services/services/services.service";
import type { ServiceListItem, ServiceCategory } from "@/lib/entity/services";
import type {
  ProcedureCatalogItem,
  ProcedureCategory,
} from "../domain/odontogram/types";

/**
 * Adapter del catálogo de servicios.
 *
 * Vive aquí y no en el hook porque `lib/odontogram/*` no puede importar
 * `lib/services/*` salvo desde un adapter: es la única puerta sancionada del
 * módulo hacia la infraestructura del host.
 *
 * NO hay catálogo de reserva. Antes existía un mock que se usaba como estado
 * inicial y como fallback: si el backend fallaba o devolvía cero servicios, el
 * odontólogo veía procedimientos y precios inventados creyéndolos los de su
 * clínica, y planificaba tratamientos con ellos. Un catálogo vacío que lo dice
 * es correcto; uno falso que parece real, no.
 */

/** Traduce la categoría del backend (mayúsculas) a la del odontograma. */
function mapCategory(
  backendCategory?: ServiceCategory | null,
): ProcedureCategory {
  if (!backendCategory) return "restaurador";
  const map: Record<string, ProcedureCategory> = {
    RESTAURADOR: "restaurador",
    ENDODONCIA: "endodoncia",
    PROTESIS: "protesis",
    IMPLANTE: "implante",
    PREVENTIVO: "preventivo",
    PERIODONCIA: "periodoncia",
    ESTETICO: "estetico",
    CIRUGIA: "cirugia",
    // ProcedureCategory (taxonomía del odontograma) aún no tiene diagnóstico/
    // ortodoncia/general; mapeamos a la más cercana para el color/agrupación.
    DIAGNOSTICO: "preventivo",
    GENERAL: "preventivo",
    ORTODONCIA: "estetico",
  };
  return map[backendCategory] ?? "restaurador";
}

/** Convierte un Service del backend en un item del catálogo del odontograma. */
export function serviceToCatalogItem(
  service: ServiceListItem,
): ProcedureCatalogItem {
  const enabled = service.odontogramEnabled;
  return {
    id: service.id,
    name: service.name,
    code: service.code,
    category: mapCategory(service.category),
    // Duración real del servicio; 0 si no está configurada (sin inventar 30 min).
    estimatedDuration: service.duration ?? 0,
    // El precio YA viene denominado en la moneda de la clínica: se toma tal
    // cual. El odontograma NUNCA convierte importes, solo los formatea (ADR-32).
    baseCost: service.cost ?? 0,
    isFavorite: false,
    // Símbolo personalizado del servicio (la presencia codifica el modo):
    // TEXT → serviceSymbolText ; ASSET → serviceSymbolUrl. Solo si está habilitado.
    serviceSymbolText:
      enabled && service.odontogramSymbolMode === "TEXT"
        ? service.symbolText
        : undefined,
    serviceSymbolUrl:
      enabled && service.odontogramSymbolMode === "ASSET"
        ? service.symbolUrl
        : undefined,
  };
}

/**
 * Trae los servicios activos habilitados para el odontograma.
 *
 * Ordena por nombre en el servidor (antes llegaba por fecha de alta, que para
 * buscar un procedimiento es un orden arbitrario) y filtra de nuevo por
 * `odontogramEnabled` en cliente: el parseo de filtros del backend descarta un
 * filtro mal formado con un simple log.warn, así que la red de seguridad cuesta
 * una línea y evita depender de un contrato que degrada callando.
 */
export async function fetchServiceCatalog(): Promise<ProcedureCatalogItem[]> {
  const services = await servicesService.getActiveOdontogramServices();
  return services
    .filter((s) => s.odontogramEnabled === true)
    .map(serviceToCatalogItem);
}
