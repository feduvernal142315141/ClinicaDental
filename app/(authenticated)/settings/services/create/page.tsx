"use client";

import { PageHeader } from "@/components/ui/layout/page-header";
import { ServiceForm } from "@/components/features/services";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateServicePage() {
  const router = useRouter();
  const { can, isAdmin } = usePermission();

  useEffect(() => {
    const allowed = isAdmin || can("service", PermissionAction.CREATE);
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  return (
    <>
      <PageHeader
        title="Nuevo Servicio"
        subtitle="Cree un nuevo servicio clínico para su catálogo."
        actionButton={{
          label: "Atrás",
          onClick: () => router.push("/settings/services"),
          variant: "back",
        }}
      />
      <ServiceForm basePath="/settings/services" />
    </>
  );
}
