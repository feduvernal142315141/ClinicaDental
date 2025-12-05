"use client";

import dynamic from "next/dynamic";
import { Header } from "@/components/ui/atomic/layout/header";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const CampaignList = dynamic(
  () =>
    import("@/components/campaign/campaign-list").then(
      (mod) => mod.CampaignList
    ),
  { loading: () => <LazyLoadingFallback /> }
);

export default function CampaignsRoute() {
  return (
    <div className="space-y-8">
      <Header
        level={1}
        title="Campañas"
        description="Gestiona tus campañas de marketing"
        showSearch
        searchPlaceholder="Buscar campañas..."
      />

      <CampaignList />
    </div>
  );
}
