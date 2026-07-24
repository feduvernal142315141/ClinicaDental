"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { InvoiceDetail } from "@/components/features/billing/detail/InvoiceDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;
  const patientName = searchParams.get("patientName") ?? undefined;

  return (
    <InvoiceDetail
      invoiceId={id}
      patientId={patientId}
      patientName={patientName ?? undefined}
    />
  );
}
