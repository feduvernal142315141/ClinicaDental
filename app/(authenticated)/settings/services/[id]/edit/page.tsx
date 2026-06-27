"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/layout/page-header";
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
      <PageHeader
        title="Editar Servicio"
        subtitle="Modifique los datos del servicio clínico."
        actionButton={{
          label: "Atrás",
          onClick: () => router.push("/settings/services"),
          variant: "back",
        }}
      />
      <ServiceForm serviceId={id} basePath="/settings/services" />
    </>
  );
}
