"use client";

import { useState } from "react";
import { OverviewSection } from "@/components/dashboard/overview-section";
import { ProductivitySection } from "@/components/dashboard/productivity-section";
import { PatientsSection } from "@/components/dashboard/patients-section";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

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
