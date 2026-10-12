/**
 * Puente odontograma → plan de tratamiento.
 *
 * Un procedimiento del catálogo planificado sobre una pieza ES una línea del
 * plan del paciente (pestaña «Sobre una pieza»), identificada por el evento del
 * que salió (`syncKey = odo:<eventId>`). El puente puede repetirse sin duplicar
 * y solo es dueño de las líneas que creó: lo añadido a mano en el plan
 * (`syncKey` nulo o con otro prefijo) no se toca nunca.
 *
 * Quién manda si los dos lados se movieron: el avance hecho en el plan no se
 * deshace desde el odontograma; el odontograma solo hace avanzar una línea, o
 * la cancela si no estaba realizada.
 *
 * Mismas reglas que la tablet (`AppMobileClinic`, `plan-bridge.ts`): los dos
 * clientes convergen sobre el mismo plan porque calculan la misma diferencia.
 * Sin HTTP: el acceso al backend entra por {@link PlanBridgeGateway}.
 */

import type {
  AddPlanItemRequest,
  PlanItemPriority,
  TreatmentPlanItem,
  UpdatePlanItemRequest,
} from "@/lib/entity/odontogram";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";
import {
  projectToCanonicalSurface,
  type CanonicalSurface,
} from "@/lib/odontogram/domain/odontogram/types/surface.types";

/** Estados que el puente sabe llevar al plan. */
export type PlanBridgeStatus =
  | "open"
  | "plan"
  | "scheduled"
  | "in_progress"
  | "done"
  | "canceled";

/** Un procedimiento planificado sobre una pieza, como lo necesita el puente. */
export interface OdontogramPlanEntry {
  eventId: string;
  /** Servicio del catálogo; el servidor pone el precio de la línea a partir de él. */
  serviceId: string;
  toothNumber: number;
  /** Caras canónicas, en orden de lectura clínica. */
  surfaces: CanonicalSurface[];
  status: PlanBridgeStatus;
  priority: PlanItemPriority;
  notes: string | null;
}

/** Lo que el puente lee de una línea del plan. */
export type PlanBridgeLine = Pick<
  TreatmentPlanItem,
  "id" | "syncKey" | "status" | "priority" | "notes" | "sessionsDone"
>;

export interface PlanBridgeChanges {
  add: AddPlanItemRequest[];
  update: { itemId: string; changes: UpdatePlanItemRequest }[];
  remove: string[];
}

const SYNC_PREFIX = "odo:";

export function syncKeyFor(eventId: string): string {
  return `${SYNC_PREFIX}${eventId}`;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ¿Puede esta entrada ser una línea? El servidor busca el servicio por id y un
 * id que no conozca rechaza la petición entera, así que lo que no tiene forma
 * de UUID (p. ej. el `"custom"` de un plan sin servicio) no se manda.
 */
export function isBridgeable(entry: OdontogramPlanEntry): boolean {
  return UUID.test(entry.serviceId);
}

// Caras en el orden en que las lee un odontólogo.
const FACE_ORDER: readonly CanonicalSurface[] = [
  "mesial",
  "oclusal",
  "distal",
  "facial",
  "lingual",
];

const BRIDGE_STATUSES: ReadonlySet<string> = new Set<PlanBridgeStatus>([
  "open",
  "plan",
  "scheduled",
  "in_progress",
  "done",
  "canceled",
]);

/**
 * Los procedimientos planificados en el odontograma, como los lee el puente.
 * Solo los de catálogo: lo que escribió una plantilla rápida no tiene servicio,
 * así que no tiene precio ni línea.
 *
 * Hay que pasarle SIEMPRE todos los eventos del odontograma: lo que falte se
 * interpreta como retirado de la pieza.
 */
export function odontogramPlanEntries(
  events: readonly ClinicalEvent[],
): OdontogramPlanEntry[] {
  const entries: OdontogramPlanEntry[] = [];
  for (const event of events) {
    if (event.type !== "plan" || !event.procedureId) continue;
    const faces = new Set(
      (event.surfaces ?? []).map((surface) =>
        projectToCanonicalSurface(surface),
      ),
    );
    const notes = event.notes?.trim();
    entries.push({
      eventId: event.id,
      serviceId: event.procedureId,
      toothNumber: event.toothNumber,
      surfaces: FACE_ORDER.filter((face) => faces.has(face)),
      status: BRIDGE_STATUSES.has(event.status)
        ? (event.status as PlanBridgeStatus)
        : "plan",
      priority: event.priority ?? "media",
      notes: notes ? notes : null,
    });
  }
  return entries;
}

/** Firma de un conjunto de entradas: dos odontogramas que planifican lo mismo dan la misma. */
export function planBridgeSignature(
  entries: readonly OdontogramPlanEntry[],
): string {
  return JSON.stringify(entries);
}

// Cuánto ha avanzado el trabajo. El puente solo mueve una línea hacia delante.
const PROGRESS: Partial<Record<string, number>> = {
  open: 0,
  plan: 0,
  scheduled: 1,
  in_progress: 2,
  done: 3,
};

function statusChange(
  entry: PlanBridgeStatus,
  line: TreatmentPlanItem["status"],
): PlanBridgeStatus | undefined {
  if (entry === line) return undefined;
  if (entry === "canceled") return line === "done" ? undefined : "canceled";
  const from = PROGRESS[line];
  const to = PROGRESS[entry];
  if (from === undefined || to === undefined) return undefined;
  return to > from ? entry : undefined;
}

/** Qué hay que cambiar en el plan para que diga lo que dice el odontograma. */
export function planBridgeChanges(
  entries: readonly OdontogramPlanEntry[],
  lines: readonly PlanBridgeLine[],
): PlanBridgeChanges {
  const usable = entries.filter(isBridgeable);
  const bySyncKey = new Map<string, PlanBridgeLine>();
  for (const line of lines) {
    if (line.syncKey?.startsWith(SYNC_PREFIX)) bySyncKey.set(line.syncKey, line);
  }

  const add: PlanBridgeChanges["add"] = [];
  const update: PlanBridgeChanges["update"] = [];
  for (const entry of usable) {
    const key = syncKeyFor(entry.eventId);
    const line = bySyncKey.get(key);
    if (!line) {
      // Un procedimiento cancelado antes de llegar al plan no tiene nada que añadir.
      if (entry.status === "canceled") continue;
      add.push({
        serviceId: entry.serviceId,
        toothNumbers: JSON.stringify([entry.toothNumber]),
        surfaces: JSON.stringify(entry.surfaces),
        odontogramEventIds: JSON.stringify([entry.eventId]),
        syncKey: key,
        quantity: 1,
        sessionsPlanned: 1,
        ...(entry.notes ? { notes: entry.notes } : {}),
      });
      continue;
    }
    const changes: UpdatePlanItemRequest = {};
    const status = statusChange(entry.status, line.status);
    if (status !== undefined) changes.status = status;
    if (entry.priority !== line.priority) changes.priority = entry.priority;
    if ((entry.notes ?? "") !== (line.notes ?? "")) {
      changes.notes = entry.notes ?? "";
    }
    if (Object.keys(changes).length > 0) {
      update.push({ itemId: line.id, changes });
    }
  }

  // El procedimiento se quitó de la pieza: su línea también, salvo que ya tenga
  // trabajo registrado, que es historia del plan.
  const known = new Set(usable.map((entry) => syncKeyFor(entry.eventId)));
  const remove: string[] = [];
  for (const [key, line] of bySyncKey) {
    if (
      !known.has(key) &&
      line.status !== "done" &&
      line.status !== "canceled" &&
      line.sessionsDone === 0
    ) {
      remove.push(line.id);
    }
  }

  return { add, update, remove };
}

/** El acceso al plan que necesita el puente. Lo implementa el hook con los services. */
export interface PlanBridgeGateway {
  /** Plan ACTIVO del paciente con sus líneas, o `null` si no tiene. Solo lectura. */
  getActivePlan: (
    patientId: string,
  ) => Promise<{ id: string; items: PlanBridgeLine[] } | null>;
  /** Id del plan activo, creándolo si falta. */
  ensurePlan: (patientId: string) => Promise<string>;
  addItem: (planId: string, item: AddPlanItemRequest) => Promise<unknown>;
  updateItem: (
    itemId: string,
    changes: UpdatePlanItemRequest,
  ) => Promise<unknown>;
  removeItem: (itemId: string) => Promise<unknown>;
}

export interface SyncOdontogramPlanResult {
  /** Se escribió en el plan: la pantalla que lo lee debe releerlo. */
  changed: boolean;
  /** El primer fallo, si lo hubo. Lo ya escrito queda; la siguiente ejecución converge. */
  error?: unknown;
}

/**
 * Pone el plan del paciente al día con el odontograma.
 *
 * Idempotente: lee el plan, calcula la diferencia y la aplica, así que repetirlo
 * —o volver a lanzarlo tras un fallo— converge en vez de acumular líneas. Las
 * altas van primero y de una en una (un servicio que el servidor no conoce
 * rechaza la petición entera), y después se relee el plan: el servidor responde
 * a un alta con un número, no con ids, y crea la línea con su precio, `plan` y
 * `media` antes de que pueda llevar la prioridad o el avance del odontograma.
 *
 * `entries` tiene que ser el odontograma ENTERO.
 */
export async function syncOdontogramPlan(
  input: { patientId: string; entries: readonly OdontogramPlanEntry[] },
  gateway: PlanBridgeGateway,
): Promise<SyncOdontogramPlanResult> {
  const { patientId, entries } = input;
  let changed = false;
  try {
    let plan = await gateway.getActivePlan(patientId);
    let changes = planBridgeChanges(entries, plan?.items ?? []);
    if (!plan && changes.add.length === 0) return { changed };

    if (changes.add.length > 0) {
      let planId = plan?.id;
      if (!planId) {
        planId = await gateway.ensurePlan(patientId);
        changed = true;
      }
      for (const item of changes.add) {
        await gateway.addItem(planId, item);
        changed = true;
      }
      plan = await gateway.getActivePlan(patientId);
      changes = planBridgeChanges(entries, plan?.items ?? []);
    }

    for (const { itemId, changes: lineChanges } of changes.update) {
      await gateway.updateItem(itemId, lineChanges);
      changed = true;
    }
    for (const itemId of changes.remove) {
      await gateway.removeItem(itemId);
      changed = true;
    }
    return { changed };
  } catch (error) {
    return { changed, error };
  }
}
