"use client";

import { use } from "react";
import { GrowthCampaignWizard } from "@/components/features/growth/campaigns/GrowthCampaignWizard";

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default function EditGrowthCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = use(params);
  return <GrowthCampaignWizard campaignId={id} />;
}
