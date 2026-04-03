"use client";

import { SectionTitle } from "@/components/ui/antd";
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
      <SectionTitle
        title="Nuevo Servicio"
        subtitle="Cree un nuevo servicio clínico"
      />
      <ServiceForm basePath="/settings/services" />
    </>
  );
}
