"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/layout/page-header";
import { EstimateForm } from "@/components/features/billing/form/EstimateForm";
import { useRouter } from "next/navigation";

export default function NewEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? "";
  const treatmentPlanId = searchParams.get("treatmentPlanId") ?? undefined;
  const planName = searchParams.get("planName") ?? undefined;
  const planTotalRaw = searchParams.get("planTotal");
  const planTotalPrice =
    planTotalRaw !== null && planTotalRaw !== ""
      ? Number(planTotalRaw)
      : undefined;

  if (!patientId) {
    return (
      <div className="bento p-6 text-sm text-subtle">
        Falta el paciente. Abre la cuenta del paciente y genera el presupuesto
        desde ahí.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo presupuesto"
        subtitle="Propuesta comercial a partir de un plan o de ítems manuales."
        actionButton={{
          label: "Atrás",
          variant: "back",
          onClick: () => router.push(`/patients/${patientId}?tab=cuenta`),
        }}
      />
      <EstimateForm
        patientId={patientId}
        treatmentPlanId={treatmentPlanId}
        planName={planName ?? undefined}
        planTotalPrice={
          Number.isFinite(planTotalPrice) ? planTotalPrice : undefined
        }
      />
    </div>
  );
}
