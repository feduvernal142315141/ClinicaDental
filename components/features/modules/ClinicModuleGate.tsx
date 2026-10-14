"use client";

import { Boxes } from "lucide-react";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { useClinicModules } from "@/lib/hooks/modules";
import {
  CLINIC_MODULE_LABELS,
  getRouteModuleRequirement,
  missingModules,
} from "@/lib/modules/clinic-modules";

export function ClinicModuleRouteGate({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { modules, loading, isError } = useClinicModules();
  const requirement = getRouteModuleRequirement(pathname);
  if (!requirement) return children;
  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner size="md" message="Cargando módulos…" /></div>;
  }
  const missing = missingModules(modules, requirement);
  if (isError || missing.length > 0) {
    const names = missing.map((module) => CLINIC_MODULE_LABELS[module]).join(", ");
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
        <EmptyState
          icon={Boxes}
          variant="card"
          title="Módulo no disponible"
          description={isError ? "No se pudo comprobar el plan de la clínica. Recarga la página para intentarlo de nuevo." : `${names} no está habilitado para esta clínica.`}
          className="w-full"
        />
      </div>
    );
  }
  return children;
}
