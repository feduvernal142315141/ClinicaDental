"use client";

import { useParams } from "next/navigation";
import { InvoiceForm } from "@/components/features/billing/invoices/InvoiceForm";

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  return <InvoiceForm invoiceId={id} />;
}
