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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          <p className="mt-2 text-subtle">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar - ancho dinámico según estado colapsado */}
      {/* En móvil el aside es `contents` (sin caja) para que el drawer `fixed`
          del Sidebar sí se renderice; en `lg+` es la barra lateral normal. */}
      <aside
        className={`contents lg:flex lg:flex-col lg:border-r lg:border-hairline lg:bg-surface lg:transition-[width] lg:duration-300 lg:ease-emphasized lg:will-change-[width] lg:motion-reduce:transition-none ${
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
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

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header móvil */}
        <MobileHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* Header desktop */}
        <AppHeader />

        {/* Contenido con scroll */}
        <main className="flex-1 overflow-auto bg-canvas p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
