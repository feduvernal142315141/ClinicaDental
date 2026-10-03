"use client";

import { useParams } from "next/navigation";
import { EstimateDetail } from "@/components/features/billing/estimates/EstimateDetail";

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <EstimateDetail estimateId={id} />;
}
