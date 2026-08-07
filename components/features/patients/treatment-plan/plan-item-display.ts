import type { StatusBadgeTone } from "@/components/ui";
import type {
  PlanItemPriority,
  PlanItemStatus,
  TreatmentPlanItem,
} from "@/lib/entity/odontogram";

/**
 * Vocabulario visual de las líneas del plan: etiqueta en español y tono del
 * pill para cada estado.
 *
 * Son EXACTAMENTE los estados del modal del diente, y las etiquetas son las
 * mismas que su desplegable: una línea del plan y un procedimiento planificado
 * sobre una pieza son la misma cosa vista desde dos pantallas, así que llamarlas
 * distinto obligaba al odontólogo a traducir de cabeza.
 *
 * Sobre los tonos: hay 7 estados y menos tonos, así que "Programado" y "En
 * curso" comparten el sky de `progress` — ambos son "en marcha" y la ETIQUETA
 * los distingue. Ningún estado se comunica solo con color (WCAG 2.2 — 1.4.1).
 */
export const PLAN_ITEM_STATUS_META: Record<
  PlanItemStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  open: { label: "Abierto", tone: "neutral" },
  plan: { label: "Planificado", tone: "info" },
  scheduled: { label: "Programado", tone: "progress" },
  in_progress: { label: "En curso", tone: "progress" },
  done: { label: "Realizado", tone: "success" },
  canceled: { label: "Cancelado", tone: "neutral" },
  observation: { label: "Observación", tone: "warning" },
};

/**
 * Etiqueta y tono de un estado. Tolera nulo y desconocido: un estado que el
 * cliente no conozca se pinta con su valor crudo en tono neutro en vez de
 * romper la fila — el servidor puede crecer el enum antes que el front.
 */
export function getPlanItemStatusMeta(
  status: PlanItemStatus | null | undefined,
): { label: string; tone: StatusBadgeTone } {
  if (status && status in PLAN_ITEM_STATUS_META) {
    return PLAN_ITEM_STATUS_META[status];
  }
  return { label: status ? String(status) : "Sin estado", tone: "neutral" };
}

/**
 * Prioridad de la línea, con el mismo vocabulario y el mismo orden que el
 * desplegable del modal del diente.
 */
export const PLAN_ITEM_PRIORITY_META: Record<
  PlanItemPriority,
  { label: string; tone: StatusBadgeTone }
> = {
  alta: { label: "Alta", tone: "danger" },
  media: { label: "Media", tone: "neutral" },
  baja: { label: "Baja", tone: "neutral" },
};

export function getPlanItemPriorityLabel(
  priority: PlanItemPriority | null | undefined,
): string {
  return priority ? PLAN_ITEM_PRIORITY_META[priority].label : "Media";
}

/** "Fase 2" / "Sin fase". El plan puede no estar faseado todavía. */
export function formatPhase(phase: number | null | undefined): string {
  return typeof phase === "number" ? `Fase ${phase}` : "Sin fase";
}

/**
 * "2 de 3" — sesiones ejecutadas de las planificadas, con los contadores del
 * SERVIDOR. `inProgress` también lo deriva él: aquí no se recalcula ninguno.
 *
 * Devuelve `null` cuando no hay nada que contar (una sola sesión planificada y
 * ninguna hecha, que es el caso por defecto de toda línea nueva): pintar
 * "0 de 1" en cada fila de un plan recién presupuestado es ruido que tapa las
 * pocas líneas que sí llevan un tratamiento largo en marcha.
 */
export function formatSessionsProgress(
  item: Pick<TreatmentPlanItem, "sessionsDone" | "sessionsPlanned">,
): string | null {
  const done = item.sessionsDone ?? 0;
  const planned = item.sessionsPlanned ?? 0;
  if (planned <= 1 && done === 0) return null;
  return `${done} de ${planned}`;
}

/**
 * Por qué el servidor rechazaría una sesión sobre esta línea, en texto y `null`
 * si la aceptaría. Espejo de las guardas de
 * `RegisterPlanItemSessionCommandHandler`.
 *
 * Se comprueba ANTES de llamar para poder decir el motivo junto a la acción, en
 * vez de dejar que el usuario descubra con un toast rojo que la línea que acaba
 * de tratar estaba cancelada. El servidor sigue siendo quien decide: esto solo
 * evita el viaje perdido, y si las dos versiones divergen manda su respuesta.
 */
export function getSessionBlockReason(
  item: Pick<TreatmentPlanItem, "status" | "sessionsDone" | "sessionsPlanned">,
): string | null {
  if (item.status === "canceled") {
    return "La línea está cancelada.";
  }
  if ((item.sessionsDone ?? 0) >= (item.sessionsPlanned ?? 0)) {
    return "Ya tiene todas sus sesiones registradas.";
  }
  return null;
}

/**
 * Sobre qué actúa la línea, en prosa: "diente 16", "dientes 16, 17", "general".
 * Es lo que distingue dos líneas del mismo servicio en el mismo plan.
 */
export function describePlanItemScope(
  item: Pick<TreatmentPlanItem, "general">,
  teeth: number[],
): string {
  if (item.general || teeth.length === 0) return "general";
  return `${teeth.length === 1 ? "diente" : "dientes"} ${teeth.join(", ")}`;
}

/**
 * Nombre con el que un lector de pantalla identifica la línea: "Endodoncia,
 * diente 16" / "Profilaxis, general". El menú de acciones de cada fila necesita
 * un nombre accesible propio — ocho botones "Más acciones" seguidos no dicen
 * sobre qué actúa cada uno.
 */
export function describePlanItem(
  item: Pick<TreatmentPlanItem, "serviceName" | "general">,
  teeth: number[],
): string {
  return `${item.serviceName}, ${describePlanItemScope(item, teeth)}`;
}

/**
 * Texto del recuento de líneas de un grupo, honesto con las anuladas.
 *
 * `count` incluye canceladas y rechazadas, pero el importe del grupo las
 * EXCLUYE. Pegar los dos números sin avisar produce cabeceras que no cuadran
 * ("8 líneas · 4.300" con 2 rechazadas), así que cuando hay anuladas se dice.
 */
export function formatGroupCount(count: number, excludedCount: number): string {
  const base = `${count} ${count === 1 ? "línea" : "líneas"}`;
  return excludedCount > 0 ? `${base} (${excludedCount} fuera del total)` : base;
}
