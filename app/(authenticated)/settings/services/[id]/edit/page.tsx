"use client";

import { use } from "react";
import { SectionTitle } from "@/components/ui/antd";
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
      <SectionTitle
        title="Editar Servicio"
        subtitle="Modifique los datos del servicio"
      />
      <ServiceForm serviceId={id} basePath="/settings/services" />
    </>
  );
}
