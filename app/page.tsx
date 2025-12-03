"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { OverviewSection } from "@/components/dashboard/overview-section";
import { ProductivitySection } from "@/components/dashboard/productivity-section";
import { PatientsSection } from "@/components/dashboard/patients-section";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useState } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // Dashboard for authenticated users
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex h-screen lg:h-screen">
        <Sidebar
          currentPath="/"
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
