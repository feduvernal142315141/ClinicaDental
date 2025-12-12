"use client";

import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const OverviewSection = dynamic(
  () =>
    import("@/components/dashboard/overview-section").then(
      (mod) => mod.OverviewSection
    ),
  { loading: () => <LazyLoadingFallback /> }
);

const ProductivitySection = dynamic(
  () =>
    import("@/components/dashboard/productivity-section").then(
      (mod) => mod.ProductivitySection
    ),
  { loading: () => <LazyLoadingFallback /> }
);

const PatientsSection = dynamic(
  () =>
    import("@/components/dashboard/patients-section").then(
      (mod) => mod.PatientsSection
    ),
  { loading: () => <LazyLoadingFallback /> }
);

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <OverviewSection />
      <ProductivitySection />
      <PatientsSection />
    </div>
  );
}
