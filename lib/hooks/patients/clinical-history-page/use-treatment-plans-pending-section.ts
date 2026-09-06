"use client";

import { useEffect, useMemo, useState } from "react";
import { useTreatmentPlans } from "@/lib/hooks/odontogram/useTreatmentPlans";
import type {
  TreatmentPlanResponse,
  TreatmentPlanDiagnosisRef,
} from "@/lib/entity/odontogram";

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

  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {

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
    loadFailed,
    pendingPlans,
    counts,
  };
}
