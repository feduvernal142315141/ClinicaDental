"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/layout/page-header";
import { InvoiceForm } from "@/components/features/billing/form/InvoiceForm";

export default function NewInvoicePage() {
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
        Falta el paciente. Abre la cuenta del paciente y emite la factura desde
        ahí.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nueva factura"
        subtitle="Cargo emitido en la cuenta del paciente (comprobante interno)."
        actionButton={{
          label: "Atrás",
          variant: "back",
          onClick: () => router.push(`/patients/${patientId}?tab=cuenta`),
        }}
      />
      <InvoiceForm
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
