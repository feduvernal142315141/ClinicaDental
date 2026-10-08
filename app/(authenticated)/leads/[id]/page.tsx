"use client";

import { useParams } from "next/navigation";
import { LeadDetailPage } from "@/components/features/leads/detail/LeadDetailPage";

export default function LeadDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <LeadDetailPage leadId={id} />;
}
