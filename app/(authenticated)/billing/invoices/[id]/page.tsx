"use client";

import { useParams } from "next/navigation";
import { InvoiceDetail } from "@/components/features/billing/invoices/InvoiceDetail";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <InvoiceDetail invoiceId={id} />;
}
