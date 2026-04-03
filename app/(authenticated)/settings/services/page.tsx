"use client";

import { SectionTitle } from "@/components/ui/antd";
import { ServicesList } from "@/components/features/services";
import { useServicesPage } from "@/lib/hooks/services/use-services-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServicesSettingsPage() {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleNewService } = useServicesPage({
    basePath: "/settings/services",
  });

  useEffect(() => {
    const allowed =
      isAdmin ||
      can("service", PermissionAction.CREATE) ||
      can("service", PermissionAction.EDIT) ||
      can("service", PermissionAction.DELETE) ||
      can("service", PermissionAction.BLOCK);

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  const canCreate = isAdmin || can("service", PermissionAction.CREATE);

  return (
    <>
      <SectionTitle
        title="Gestión de Servicios"
        subtitle="Administre el catálogo de servicios clínicos"
        actionButton={
          canCreate
            ? {
                label: "Nuevo Servicio",
                onClick: handleNewService,
              }
            : undefined
        }
      />
      <ServicesList basePath="/settings/services" />
    </>
  );
}
