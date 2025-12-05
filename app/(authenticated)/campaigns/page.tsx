"use client";

import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const CampaignList = dynamic(
  () =>
    import("@/components/campaign/campaign-list").then(
      (mod) => mod.CampaignList
    ),
  { loading: () => <LazyLoadingFallback /> }
);

export default function CampaignsRoute() {
  return <CampaignList />;
}
