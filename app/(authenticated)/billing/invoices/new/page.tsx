"use client";

import { useSearchParams } from "next/navigation";
import { InvoiceForm } from "@/components/features/billing/invoices/InvoiceForm";

export default function NewInvoicePage() {
  const params = useSearchParams();
  const chargeIds = params.get("chargeIds");
  return (
    <InvoiceForm
      initialPatientId={params.get("patientId") ?? undefined}
      initialPatientName={params.get("patientName") ?? undefined}
      initialChargeIds={chargeIds ? chargeIds.split(",").filter(Boolean) : undefined}
    />
  );
}
