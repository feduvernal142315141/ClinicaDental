"use client";

import { useSearchParams } from "next/navigation";
import { EstimateForm } from "@/components/features/billing/estimates/EstimateForm";

export default function NewEstimatePage() {
  const params = useSearchParams();
  return (
    <EstimateForm
      initialPatientId={params.get("patientId") ?? undefined}
      initialPatientName={params.get("patientName") ?? undefined}
      initialPlanId={params.get("treatmentPlanId") ?? undefined}
    />
  );
}
