import type { StatusBadgeTone } from "@/components/ui";
import type {
  PlanItemDecision,
  PlanItemDisplayStatus,
  TreatmentPlanItem,
} from "@/lib/entity/odontogram";

/**
 * Vocabulario visual de las líneas del plan: etiqueta en español y tono del
 * pill para cada `displayStatus`.
 *
 * `displayStatus` lo deriva el SERVIDOR aplicando su propia precedencia (hecho
 * consumado > anulación > decisión comercial). Aquí solo se traduce: recalcular
 * la precedencia en el cliente la haría divergir del presupuesto guardado.
 *
 * Sobre los tonos: hay 8 estados y 6 tonos, así que "Agendado" y "En curso"
 * comparten el sky de `progress` — ambos son "en marcha" y la ETIQUETA los
 * distingue. Ningún estado se comunica solo con color (WCAG 2.2 — 1.4.1).
 */
export const PLAN_ITEM_STATUS_META: Record<
  PlanItemDisplayStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  proposed: { label: "Propuesto", tone: "neutral" },
  accepted: { label: "Aceptado", tone: "info" },
  postponed: { label: "Pospuesto", tone: "warning" },
  rejected: { label: "Rechazado", tone: "danger" },
  scheduled: { label: "Agendado", tone: "progress" },
  in_progress: { label: "En curso", tone: "progress" },
  done: { label: "Hecho", tone: "success" },
  cancelled: { label: "Anulado", tone: "neutral" },
};

/**
 * Etiqueta y tono de un `displayStatus`, con salida segura si el backend
 * estrena un valor que este front todavía no conoce: se pinta el código crudo
 * en vez de dejar la celda vacía (una celda vacía se lee como "sin estado").
 */
export function getPlanItemStatusMeta(status: PlanItemDisplayStatus | null | undefined): {
  label: string;
  tone: StatusBadgeTone;
} {
  if (status && status in PLAN_ITEM_STATUS_META) {
    return PLAN_ITEM_STATUS_META[status];
  }
  return { label: status ? String(status) : "Sin estado", tone: "neutral" };
}

/**
 * Las decisiones que el menú de la fila ofrece, en el orden en que se toman.
 *
 * `proposed` NO está: es el estado de partida de toda línea, no algo que se
 * elija. "Des-aceptar" tampoco existe como gesto — lo que hay es posponer o
 * rechazar, y cada uno significa una cosa distinta para el paciente.
 *
 * `verb` es lo que se pulsa ("Aceptar") y `label` cómo queda ("Aceptado"): el
 * menú marca la decisión vigente, así que las dos formas se ven a la vez.
 */
export const PLAN_ITEM_DECISION_ACTIONS: ReadonlyArray<{
  decision: Exclude<PlanItemDecision, "proposed">;
  verb: string;
  label: string;
}> = [
  { decision: "accepted", verb: "Aceptar", label: "Aceptado" },
  { decision: "postponed", verb: "Posponer", label: "Pospuesto" },
  { decision: "rejected", verb: "Rechazar", label: "Rechazado" },
];

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
 * si la aceptaría. Espejo de las tres guardas de
 * `RegisterPlanItemSessionCommandHandler`.
 *
 * Se comprueba ANTES de llamar para poder decir el motivo junto a la acción, en
 * vez de dejar que el usuario descubra con un toast rojo que la línea que acaba
 * de tratar estaba rechazada. El servidor sigue siendo quien decide: esto solo
 * evita el viaje perdido, y si las dos versiones divergen manda su respuesta.
 */
export function getSessionBlockReason(
  item: Pick<
    TreatmentPlanItem,
    "status" | "decision" | "sessionsDone" | "sessionsPlanned"
  >,
): string | null {
  if (item.status === "cancelled") {
    return "La línea está anulada.";
  }
  if (item.decision === "rejected") {
    return "El paciente la rechazó: acéptala primero.";
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
