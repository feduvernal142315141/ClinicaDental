"use client";

import { use } from "react";
import { GrowthCampaignDetail } from "@/components/features/growth/campaigns/GrowthCampaignDetail";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function GrowthCampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = use(params);
  return <GrowthCampaignDetail campaignId={id} />;
}
