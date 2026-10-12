"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  odontogramService,
  treatmentPlanItemService,
} from "@/lib/services/odontogram";
import {
  createPlanBridgeController,
  type PlanBridgeController,
  type PlanBridgeControllerGateway,
  type PlanBridgeSnapshot,
  type PlanBridgeSyncStatus,
} from "@/lib/odontogram/application/plan-bridge-controller";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";
import { ensureActivePlan, findActivePlan } from "./usePatientTreatmentPlan";
import { notifyTreatmentPlanChanged } from "./treatment-plan-changes";

/** El puente contra el backend real, con los services que ya usa la pantalla del plan. */
const gateway: PlanBridgeControllerGateway = {
  async getActivePlan(patientId) {
    const plan = await findActivePlan(patientId);
    if (!plan) return null;
    const { items } = await treatmentPlanItemService.getPlanItems(plan.id);
    return { id: plan.id, items: items ?? [] };
  },
  async ensurePlan(patientId) {
    return (await ensureActivePlan(patientId)).id;
  },
  // Una línea por petición: un servicio que el servidor no conozca rechaza la
  // petición entera y se llevaría por delante a las demás.
  addItem: (planId, item) =>
    treatmentPlanItemService.addPlanItems(planId, { items: [item] }),
  updateItem: (itemId, changes) =>
    treatmentPlanItemService.updatePlanItem(itemId, changes),
  removeItem: (itemId) => treatmentPlanItemService.removePlanItem(itemId),
  async readPersistedEvents(patientId) {
    const response = await odontogramService.getOdontogram(patientId);
    if (!response) return [];
    const state = JSON.parse(response.state) as {
      clinicalEvents?: ClinicalEvent[];
    };
    return Array.isArray(state.clinicalEvents) ? state.clinicalEvents : [];
  },
};

export interface UseOdontogramPlanBridgeResult {
  /** Para `OdontogramModule.onInSync`. Identidad estable. */
  onInSync: (snapshot: PlanBridgeSnapshot) => void;
  /** Para `OdontogramModule.onOutOfSync`. Identidad estable. */
  onOutOfSync: () => void;
  /**
   * `stale`: el odontograma guardado ya no planifica lo mismo que este cliente
   * (otro equipo guardó después); el plan no se toca hasta recargar.
   */
  status: PlanBridgeSyncStatus;
}

/**
 * Mantiene el plan de tratamiento del paciente al día con lo planificado en su
 * odontograma mientras el expediente está abierto.
 *
 * El host le pasa las dos señales del módulo y `enabled = false` en solo
 * lectura: un odontograma histórico no es lo que el paciente tiene planificado
 * hoy.
 */
export function useOdontogramPlanBridge(
  patientId: string,
  { enabled }: { enabled: boolean },
): UseOdontogramPlanBridgeResult {
  const [status, setStatus] = useState<PlanBridgeSyncStatus>("idle");
  const controllerRef = useRef<PlanBridgeController | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    const controller = createPlanBridgeController({
      patientId,
      gateway,
      onStatus: setStatus,
      onPlanChanged: notifyTreatmentPlanChanged,
    });
    controller.setEnabled(enabledRef.current);
    controllerRef.current = controller;
    setStatus("idle");
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [patientId]);

  useEffect(() => {
    enabledRef.current = enabled;
    controllerRef.current?.setEnabled(enabled);
  }, [enabled]);

  const onInSync = useCallback((snapshot: PlanBridgeSnapshot) => {
    controllerRef.current?.inSync(snapshot);
  }, []);
  const onOutOfSync = useCallback(() => {
    controllerRef.current?.outOfSync();
  }, []);

  return { onInSync, onOutOfSync, status };
}
