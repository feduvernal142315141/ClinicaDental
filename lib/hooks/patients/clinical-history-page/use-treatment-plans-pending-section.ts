"use client";

import { useEffect, useMemo, useState } from "react";
import { useTreatmentPlans } from "@/lib/hooks/odontogram/useTreatmentPlans";
import type {
  TreatmentPlanResponse,
  TreatmentPlanDiagnosisRef,
} from "@/lib/entity/odontogram";

/** Estado de avance derivado para mostrar en la UI de historia clínica. */
export type DerivedPlanStatus =
  | "pendiente"
  | "en-curso"
  | "completado"
  | "cancelado";

export interface PendingPlanView {
  id: string;
  name: string;
  description?: string;
  eventCount: number;
  status: DerivedPlanStatus;
  linkedDiagnosis?: TreatmentPlanDiagnosisRef;
}

export interface TreatmentStatusCounts {
  pendiente: number;
  enCurso: number;
  completado: number;
  cancelado: number;
  total: number;
}

function countPlanEvents(eventIds?: string | null) {
  try {
    const parsed = JSON.parse(eventIds ?? "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Deriva el estado de avance del plan a partir de su `status` (backend) y de si
 * ya tiene procedimientos asociados: un plan activo sin tratamientos está
 * "pendiente"; con tratamientos, "en curso".
 */
function derivePlanStatus(
  plan: TreatmentPlanResponse,
  eventCount: number,
): DerivedPlanStatus {
  if (plan.status === "completed") return "completado";
  if (plan.status === "cancelled") return "cancelado";
  return eventCount > 0 ? "en-curso" : "pendiente";
}

export function useTreatmentPlansPendingSection(patientId: string) {
  const { plans, fetchPlans, loading } = useTreatmentPlans();
  // Un fallo de lectura deja `plans` en `[]`, igual que un paciente sin planes.
  // Sin esta bandera, la UI no puede distinguir "cero planes" de "no se pudo
  // leer", y pintaría un 0 —una afirmación clínica— sobre un 403 o un 5xx.
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // `fetchPlans` ya avisa con toast y RELANZA. El servicio ahora rechaza de
    // verdad ante un 403/500 (antes devolvía el cuerpo de error como si fuera
    // una página vacía de planes), así que sin este `catch` la promesa quedaría
    // sin manejar. Mismo patrón que `finalize-appointment-modal.tsx:111`.
    setLoadFailed(false);
    void fetchPlans(patientId, { page: 0, pageSize: 50 }).catch(() => {
      setLoadFailed(true);
    });
  }, [patientId, fetchPlans]);

  const counts = useMemo<TreatmentStatusCounts>(() => {
    const acc: TreatmentStatusCounts = {
      pendiente: 0,
      enCurso: 0,
      completado: 0,
      cancelado: 0,
      total: plans.length,
    };
    for (const plan of plans) {
      const status = derivePlanStatus(plan, countPlanEvents(plan.eventIds));
      if (status === "pendiente") acc.pendiente += 1;
      else if (status === "en-curso") acc.enCurso += 1;
      else if (status === "completado") acc.completado += 1;
      else acc.cancelado += 1;
    }
    return acc;
  }, [plans]);

  const pendingPlans = useMemo<PendingPlanView[]>(
    () =>
      plans
        .filter(
          (plan) => plan.status !== "completed" && plan.status !== "cancelled",
        )
        .map((plan) => {
          const eventCount = countPlanEvents(plan.eventIds);
          return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            eventCount,
            status: derivePlanStatus(plan, eventCount),
            linkedDiagnosis: plan.linkedDiagnosis,
          };
        }),
    [plans],
  );

  return {
    loading,
    /** La carga de planes falló (403/5xx/red): los contadores NO son un hecho. */
    loadFailed,
    pendingPlans,
    counts,
  };
}
