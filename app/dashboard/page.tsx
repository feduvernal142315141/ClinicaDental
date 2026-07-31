"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  const { loading: loadingAuth } = useAuth();
  const { can, isAdmin } = usePermission();

  const canSeeDashboard =
    isAdmin ||
    can("reports", PermissionAction.CREATE) ||
    can("reports", PermissionAction.EDIT) ||
    can("reports", PermissionAction.DELETE) ||
    can("reports", PermissionAction.BLOCK);

  // Mientras la sesión hidrata todavía no se conocen los permisos: no mostrar
  // el aviso de "sin permisos" a alguien que sí los tiene.
  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner message="Cargando dashboard..." />
      </div>
    );
  }

  // Sin permiso de reportes no se monta DashboardContent: sus hooks piden
  // /dashboard/summary y /clinic/general-settings, que el backend deniega con
  // 403. Se informa en lugar de redirigir: /appointments ya redirige aquí
  // cuando falta su permiso, y un redirect inverso crearía un bucle.
  if (!canSeeDashboard) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Dashboard
          </h1>
          <p className="text-sm text-subtle">
            Resumen operativo de la clínica.
          </p>
        </div>

        <Alert variant="info" live={false}>
          <ShieldAlert />
          <AlertTitle>Tu rol no incluye reportes</AlertTitle>
          <AlertDescription>
            El resumen del dashboard requiere el permiso de reportes, que tu rol
            no tiene asignado. Tu sesión sigue activa: usa el menú lateral para
            ir a las secciones disponibles para ti. Si necesitas ver estos
            datos, pídele a un administrador que amplíe los permisos de tu rol.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <DashboardContent />;
}
