"use client";

import { useEffect, useMemo } from "react";
import { useTreatmentPlans } from "@/lib/hooks/odontogram/useTreatmentPlans";

function countPlanEvents(eventIds?: string | null) {
  try {
    const parsed = JSON.parse(eventIds ?? "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function useTreatmentPlansPendingSection(patientId: string) {
  const { plans, fetchPlans, loading } = useTreatmentPlans();

  useEffect(() => {
    fetchPlans(patientId, { page: 0, pageSize: 50 });
  }, [patientId, fetchPlans]);

  const pendingPlans = useMemo(
    () =>
      plans
        .filter(
          (plan) => plan.status !== "completed" && plan.status !== "cancelled",
        )
        .map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          eventCount: countPlanEvents(plan.eventIds),
        })),
    [plans],
  );

  return {
    loading,
    pendingPlans,
  };
}
