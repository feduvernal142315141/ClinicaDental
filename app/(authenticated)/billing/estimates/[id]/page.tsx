"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { EstimateDetail } from "@/components/features/billing/detail/EstimateDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EstimateDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;

  return <EstimateDetail estimateId={id} patientId={patientId} />;
}
