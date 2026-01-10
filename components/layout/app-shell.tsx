"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { AppHeader } from "@/components/layout/app-header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed((v) => !v);

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

  if (!user) return null;

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {/* Inner container with rounded corners */}
      <div className="h-full flex overflow-hidden rounded-2xl bg-background">
        {/* Sidebar - dynamic width based on collapsed state */}
        <aside
          className={`hidden lg:flex flex-col bg-muted/30 rounded-l-2xl transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <Sidebar
            currentPath={pathname}
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-r-2xl">
          {/* Mobile header - solo visible en mobile */}
          <MobileHeader
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
          />

          {/* Desktop header */}
          <AppHeader />

          {/* Content area with scroll */}
          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
