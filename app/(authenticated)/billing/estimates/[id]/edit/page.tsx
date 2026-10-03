"use client";

import { useParams } from "next/navigation";
import { EstimateForm } from "@/components/features/billing/estimates/EstimateForm";

export default function EditEstimatePage() {
  const { id } = useParams<{ id: string }>();
  return <EstimateForm estimateId={id} />;
}
