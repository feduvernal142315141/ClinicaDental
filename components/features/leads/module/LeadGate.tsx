"use client";

import { Lock, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { PageSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import { useLeadAccess } from "@/lib/hooks/leads";

/** "Módulo no disponible": la clínica no tiene Adquisición de pacientes activo. */
export function LeadModuleUnavailable() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
      <EmptyState
        icon={UserPlus}
        variant="card"
        title="Tu clínica no tiene habilitado este módulo"
        description="Adquisición de pacientes no está activo para esta clínica. Contacta a KodeWave para activarlo."
        className="w-full"
      />
    </div>
  );
}

export function LeadNoPermission() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center">
      <EmptyState
        icon={Lock}
        variant="card"
        title="No tienes permiso para esta sección"
        description="Pide a un administrador que te asigne el permiso de Adquisición de pacientes."
        className="w-full"
      />
    </div>
  );
}

/**
 * Puerta de toda ruta `/leads/*`:
 * 1. módulo apagado (`modules` sin "LEAD_CRM") → "Módulo no disponible";
 * 2. sin ninguna acción sobre `leads` → "No tienes permiso";
 * 3. si no, la pantalla.
 */
export function LeadGate({ children }: { children: React.ReactNode }) {
  const { enabled, loading, permissions } = useLeadAccess();

  if (loading) return <PageSkeleton label="Cargando Adquisición de pacientes…" />;
  if (!enabled) return <LeadModuleUnavailable />;
  if (!permissions.canView) return <LeadNoPermission />;
  return <>{children}</>;
}
