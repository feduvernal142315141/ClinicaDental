"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex h-screen lg:h-screen">
        <Sidebar
          currentPath="/dashboard"
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto pt-0 lg:pt-6">
          <div className="space-y-8">
            <OverviewSection />
            <ProductivitySection />
            <PatientsSection />
          </div>
        </main>
      </div>
    </div>
  );
}
