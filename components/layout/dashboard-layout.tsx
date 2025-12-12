"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { AppHeader } from "@/components/layout/app-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export function DashboardLayout({
  children,
  currentPath,
}: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

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
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <AppHeader />

      <div className="flex h-screen lg:h-screen">
        <Sidebar
          currentPath={currentPath}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto pt-0 lg:pt-6 rounded-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
