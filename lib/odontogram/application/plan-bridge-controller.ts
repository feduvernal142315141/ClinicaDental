/**
 * Cuándo corre el puente odontograma → plan.
 *
 * El puente borra líneas del plan cuando su procedimiento ya no está en el
 * odontograma, así que solo puede fiarse de un odontograma que sea DE VERDAD el
 * del paciente. Este controlador lo garantiza en dos pasos:
 *
 * 1. Solo se arma con un snapshot que el módulo declara «al día»
 *    ({@link PlanBridgeController.inSync}): recién cargado del servidor, o
 *    recién aceptado por él en un guardado, y sin ediciones posteriores.
 *    Cargando, con la carga fallida, con cambios sin guardar o con un guardado
 *    rechazado (409 de versión, red) nunca llega aquí, y lo que estuviera
 *    esperando se cancela ({@link PlanBridgeController.outOfSync}).
 * 2. Justo antes de escribir, relee el odontograma PERSISTIDO y compara lo que
 *    planifica con lo que este cliente cree. El backend solo rechaza versiones
 *    MENORES que la guardada: dos equipos que cargaron la misma versión se
 *    pisan sin 409, de modo que «mi guardado fue aceptado» no prueba que este
 *    cliente siga al día un segundo y medio después. Si no coinciden, no se
 *    toca el plan (`stale`).
 *
 * Una ejecución a la vez por paciente, y si llega otra mientras corre se guarda
 * solo la más reciente: dos a la vez verían el plan sin la línea nueva y la
 * añadirían las dos, o crearían dos planes.
 */

import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";
import {
  odontogramPlanEntries,
  planBridgeSignature,
  syncOdontogramPlan,
  type OdontogramPlanEntry,
  type PlanBridgeGateway,
} from "./plan-bridge";

/** Espera a que el doctor deje de tocar antes de escribir en el plan. */
export const PLAN_BRIDGE_SETTLE_MS = 1500;

export type PlanBridgeSyncStatus = "idle" | "syncing" | "failed" | "stale";

export interface PlanBridgeControllerGateway extends PlanBridgeGateway {
  /**
   * Los eventos clínicos del odontograma tal como están guardados AHORA en el
   * servidor (vacío si el paciente aún no tiene odontograma).
   */
  readPersistedEvents: (patientId: string) => Promise<readonly ClinicalEvent[]>;
}

export interface PlanBridgeControllerOptions {
  patientId: string;
  gateway: PlanBridgeControllerGateway;
  settleMs?: number;
  onStatus?: (status: PlanBridgeSyncStatus) => void;
  /** Se escribió en el plan del paciente. */
  onPlanChanged?: (patientId: string) => void;
}

/** Lo mínimo de un snapshot que el puente necesita. */
export interface PlanBridgeSnapshot {
  clinicalEvents: readonly ClinicalEvent[];
  metadata: { patientId: string };
}

export interface PlanBridgeController {
  /** El odontograma local coincide con lo que el servidor tiene guardado. */
  inSync: (snapshot: PlanBridgeSnapshot) => void;
  /** Dejó de coincidir: cargando, editado sin guardar, o guardado/carga fallidos. */
  outOfSync: () => void;
  /** `false` en solo lectura (histórico, visita cerrada, sin permiso). */
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

interface Request {
  entries: OdontogramPlanEntry[];
  signature: string;
}

// Cola por paciente compartida por todos los controladores de este contexto JS
// (dos paneles montados a la vez, el doble montaje de StrictMode).
const tailByPatient = new Map<string, Promise<void>>();

function serialized(patientId: string, task: () => Promise<void>): Promise<void> {
  const previous = tailByPatient.get(patientId) ?? Promise.resolve();
  const next = previous.then(task, task);
  tailByPatient.set(patientId, next);
  void next.finally(() => {
    if (tailByPatient.get(patientId) === next) tailByPatient.delete(patientId);
  });
  return next;
}

export function createPlanBridgeController({
  patientId,
  gateway,
  settleMs = PLAN_BRIDGE_SETTLE_MS,
  onStatus,
  onPlanChanged,
}: PlanBridgeControllerOptions): PlanBridgeController {
  let enabled = true;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let queued: Request | null = null;
  /** Firma de lo último que el plan refleja con certeza; `null` = nunca. */
  let synced: string | null = null;
  let first = true;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const runOne = async (request: Request): Promise<PlanBridgeSyncStatus> => {
    let persisted: readonly ClinicalEvent[];
    try {
      persisted = await gateway.readPersistedEvents(patientId);
    } catch {
      return "failed";
    }
    const persistedSignature = planBridgeSignature(
      odontogramPlanEntries(persisted),
    );
    if (persistedSignature !== request.signature) return "stale";
    if (disposed) return "idle";

    const result = await syncOdontogramPlan(
      { patientId, entries: request.entries },
      gateway,
    );
    if (result.changed) onPlanChanged?.(patientId);
    if (result.error !== undefined) return "failed";
    synced = request.signature;
    return "idle";
  };

  const drain = async (initial: Request) => {
    let next: Request | null = initial;
    let status: PlanBridgeSyncStatus = "idle";
    while (next !== null && !disposed) {
      queued = null;
      const request: Request = next;
      await serialized(patientId, async () => {
        status = await runOne(request);
      });
      next = queued;
    }
    running = false;
    if (!disposed) onStatus?.(status);
  };

  const request = (next: Request) => {
    if (running) {
      queued = next;
      return;
    }
    running = true;
    onStatus?.("syncing");
    void drain(next);
  };

  return {
    inSync(snapshot) {
      if (disposed || !enabled) return;
      if (snapshot.metadata.patientId !== patientId) return;
      const entries = odontogramPlanEntries(snapshot.clinicalEvents);
      const signature = planBridgeSignature(entries);
      clearTimer();
      if (signature === synced) return;
      // La primera vez no hay toques que agrupar: lo planificado antes de
      // existir el puente llega al plan nada más abrir el expediente.
      const delay = first ? 0 : settleMs;
      first = false;
      timer = setTimeout(() => {
        timer = null;
        request({ entries, signature });
      }, delay);
    },
    outOfSync() {
      clearTimer();
      queued = null;
    },
    setEnabled(next) {
      enabled = next;
      if (!next) {
        clearTimer();
        queued = null;
      }
    },
    dispose() {
      disposed = true;
      clearTimer();
      queued = null;
    },
  };
}
