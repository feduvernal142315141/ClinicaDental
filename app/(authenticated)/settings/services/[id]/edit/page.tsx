"use client";

import { use } from "react";
import { AppBreadcrumb } from "@/components/ui/antd";
import { ServiceForm } from "@/components/features/services";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default function EditServicePage({ params }: EditServicePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { can, isAdmin } = usePermission();

  useEffect(() => {
    const allowed = isAdmin || can("service", PermissionAction.EDIT);
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Editar Servicio
        </h2>
        <p className="mt-1 text-base text-gray-500">
          Modifique los datos del servicio clínico.
        </p>
      </div>
      <ServiceForm serviceId={id} basePath="/settings/services" />
    </>
  );
}
