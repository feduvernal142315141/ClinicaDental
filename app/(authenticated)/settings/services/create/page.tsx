"use client";

import { AppBreadcrumb } from "@/components/ui/antd";
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
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Nuevo Servicio
        </h2>
        <p className="mt-1 text-base text-gray-500">
          Cree un nuevo servicio clínico para su catálogo hospitalario.
        </p>
      </div>
      <ServiceForm basePath="/settings/services" />
    </>
  );
}
