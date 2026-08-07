"use client";

import { useAuth } from "@/lib/contexts/auth-context";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  const { loading: loadingAuth } = useAuth();

  // El dashboard es visible para cualquier usuario autenticado, sin mirar rol ni
  // permisos: la restricción por `reports` se retiró también en el backend
  // (`GET /dashboard/summary` y el GET de `/clinic/general-settings`), así que
  // aquí no queda nada que comprobar. Solo se espera a que la sesión hidrate.
  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner message="Cargando dashboard..." />
      </div>
    );
  }

  return <DashboardContent />;
}
