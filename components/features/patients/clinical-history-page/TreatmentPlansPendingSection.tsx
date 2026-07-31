"use client";

import { CheckCircle2, Stethoscope, ArrowUpRight } from "lucide-react";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import type {
  DerivedPlanStatus,
  PendingPlanView,
} from "@/lib/hooks/patients/clinical-history-page/use-treatment-plans-pending-section";

interface TreatmentPlansPendingSectionProps {
  plans: PendingPlanView[];
  loading: boolean;
  /** Lleva al usuario a la pestaña Odontograma (donde vive el plan). */
  onViewOdontogram?: () => void;
}

/** Etiqueta y tono del pill de estado de cada plan. */
const STATUS_META: Record<
  DerivedPlanStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  pendiente: { label: "Pendiente", tone: "warning" },
  "en-curso": { label: "En curso", tone: "progress" },
  completado: { label: "Completado", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

export function TreatmentPlansPendingSection({
  plans,
  loading,
  onViewOdontogram,
}: TreatmentPlansPendingSectionProps) {
  if (loading) {
    return (
      <div className="py-2">
        <LoadingSpinner size="sm" message="Cargando planes..." />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Sin planes pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map((plan) => {
        const meta = STATUS_META[plan.status];
        return (
          <div
            key={plan.id}
            className="rounded-xl border border-hairline bg-elevated p-3 text-xs transition-colors hover:bg-hover"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-ink truncate">{plan.name}</span>
              <StatusBadge tone={meta.tone} className="shrink-0">
                {meta.label}
              </StatusBadge>
            </div>

            {plan.description && (
              <p className="text-muted-foreground mt-1 line-clamp-2">
                {plan.description}
              </p>
            )}

            {plan.linkedDiagnosis && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Stethoscope className="h-3 w-3 shrink-0 text-brand" />
                <span className="truncate">
                  <span className="font-semibold text-ink">
                    {plan.linkedDiagnosis.code}
                  </span>{" "}
                  {plan.linkedDiagnosis.label}
                  {plan.linkedDiagnosis.toothFdi
                    ? ` · diente ${plan.linkedDiagnosis.toothFdi}`
                    : ""}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              {plan.eventCount > 0 ? (
                <span className="text-muted-foreground">
                  {plan.eventCount} tratamiento
                  {plan.eventCount !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">Sin tratamientos</span>
              )}

              {onViewOdontogram && (
                <button
                  type="button"
                  onClick={onViewOdontogram}
                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                >
                  Ver en odontograma
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
