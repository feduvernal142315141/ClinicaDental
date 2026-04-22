"use client";

import { useEffect } from "react";
import { Spin, Tag } from "antd";
import { App } from "antd";
import { useTreatmentPlans } from "@/lib/hooks/odontogram/useTreatmentPlans";

interface TreatmentPlansPendingSectionProps {
  patientId: string;
}

export function TreatmentPlansPendingSection({
  patientId,
}: TreatmentPlansPendingSectionProps) {
  const { plans, fetchPlans, loading } = useTreatmentPlans();

  useEffect(() => {
    fetchPlans(patientId, { page: 0, pageSize: 50 });
  }, [patientId, fetchPlans]);

  const pending = plans.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );

  if (loading) {
    return (
      <div className="py-2">
        <Spin size="small" />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sin planes pendientes</p>
    );
  }

  return (
    <div className="space-y-2">
      {pending.map((plan) => {
        let eventCount = 0;
        try {
          const parsed = JSON.parse(plan.eventIds ?? "[]");
          eventCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          eventCount = 0;
        }

        return (
          <div key={plan.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{plan.name}</span>
              <Tag color="blue">Activo</Tag>
            </div>
            {plan.description && (
              <p className="text-muted-foreground mt-0.5 truncate">
                {plan.description}
              </p>
            )}
            {eventCount > 0 && (
              <p className="text-muted-foreground mt-0.5">
                {eventCount} tratamiento{eventCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
