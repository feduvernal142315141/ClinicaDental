"use client";

import { useSearchParams } from "next/navigation";
import { PaymentsPage } from "@/components/features/billing/payments/PaymentsPage";

export default function BillingPaymentsPage() {
  const params = useSearchParams();
  const patientId = params.get("patientId");
  return (
    <PaymentsPage
      initialPatient={patientId ? { id: patientId, name: params.get("patientName") ?? "Paciente" } : null}
    />
  );
}
