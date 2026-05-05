"use client";

import { Spin, Tag } from "antd";
import { useTreatmentPlansPendingSection } from "@/lib/hooks/patients/clinical-history-page/use-treatment-plans-pending-section";

interface TreatmentPlansPendingSectionProps {
  patientId: string;
}

export function TreatmentPlansPendingSection({
  patientId,
}: TreatmentPlansPendingSectionProps) {
  const { loading, pendingPlans } = useTreatmentPlansPendingSection(patientId);

  if (loading) {
    return (
      <div className="py-2">
        <Spin size="small" />
      </div>
    );
  }

  if (pendingPlans.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sin planes pendientes</p>
    );
  }

  return (
    <div className="space-y-2">
      {pendingPlans.map((plan) => (
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
              {plan.eventCount} tratamiento{plan.eventCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
