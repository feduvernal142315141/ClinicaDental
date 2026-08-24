import type { ServiceCategory, ServiceListItem } from "@/lib/entity/services";

/**
 * Vocabulario visual del CATÁLOGO de servicios dentro del panel "Añadir al
 * plan". Es el complemento de `plan-item-display.ts`, que traduce las líneas ya
 * presupuestadas: aquí se traduce lo que todavía es catálogo.
 */

/** Clave de las fichas sin categoría. No es un valor del backend. */
export const UNCATEGORIZED_KEY = "__none__";

/** Chip que representa "sin filtro". No es una categoría del backend. */
export const ALL_CATEGORIES_KEY = "__all__";

/**
 * Etiquetas en español de `ServiceCategory`. El backend manda el enum crudo
 * (`PROTESIS`), que en pantalla se lee como un identificador, no como una
 * categoría clínica.
 */
export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  DIAGNOSTICO: "Diagnóstico",
  PREVENTIVO: "Preventivo",
  RESTAURADOR: "Restaurador",
  ENDODONCIA: "Endodoncia",
  PERIODONCIA: "Periodoncia",
  PROTESIS: "Prótesis",
  IMPLANTE: "Implante",
  CIRUGIA: "Cirugía",
  ORTODONCIA: "Ortodoncia",
  ESTETICO: "Estético",
  GENERAL: "General",
};

/**
 * Etiqueta de una categoría. Si el backend estrena un valor que este front no
 * conoce se pinta el código crudo: es feo, pero esconder la ficha la dejaría
 * fuera de todos los chips y el servicio parecería no existir.
 */
export function getServiceCategoryLabel(
  category: string | null | undefined,
): string {
  if (!category) return "Sin categoría";
  return (
    SERVICE_CATEGORY_LABEL[category as ServiceCategory] ?? String(category)
  );
}

export interface ServiceCategoryChip {
  /** `ServiceCategory` o {@link UNCATEGORIZED_KEY}. */
  value: string;
  label: string;
  count: number;
}

/**
 * Chips de categoría DERIVADOS del catálogo real que se está enseñando, con su
 * contador. No es una lista fija de `ServiceCategory`: una clínica que solo
 * hace ortodoncia no debe ver diez chips vacíos, y un chip con `0` es una vía
 * muerta que solo sirve para vaciar la lista.
 *
 * Los recuentos van sobre el catálogo COMPLETO de la pestaña, no sobre el
 * resultado de la búsqueda: si bailaran con cada tecla dejarían de ser el mapa
 * del catálogo y pasarían a ser ruido.
 */
export function buildCategoryChips(
  services: ServiceListItem[],
): ServiceCategoryChip[] {
  const counts = new Map<string, number>();
  for (const service of services) {
    const key = service.category ?? UNCATEGORIZED_KEY;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({
    value,
    label: getServiceCategoryLabel(
      value === UNCATEGORIZED_KEY ? null : value,
    ),
    count,
  })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"),
  );
}

/** "LIM-01 · 30 min". Ficha corta bajo el nombre; vacía si no hay ni código ni duración. */
export function formatServiceMeta(service: ServiceListItem): string {
  const parts: string[] = [];
  if (service.code) parts.push(service.code);
  if (typeof service.duration === "number" && service.duration > 0) {
    parts.push(`${service.duration} min`);
  }
  return parts.join(" · ");
}

/**
 * Texto sobre el que busca `matchesQuery`. Incluye la categoría YA TRADUCIDA
 * para que "prótesis" encuentre las fichas cuya categoría es `PROTESIS` aunque
 * la palabra no aparezca en su nombre.
 */
export function buildServiceSearchText(service: ServiceListItem): string {
  return [
    service.name,
    service.code,
    getServiceCategoryLabel(service.category),
  ]
    .filter(Boolean)
    .join(" ");
}
