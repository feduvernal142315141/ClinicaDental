"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/layout/page-header";
import { RoleForm } from "@/components/roles";
import { useRolesPage } from "@/lib/hooks/roles/use-roles-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditRolePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleBackToList } = useRolesPage({ basePath: "/settings/roles" });

  useEffect(() => {
    const allowed = isAdmin || can("role", PermissionAction.EDIT);
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  return (
    <>
      <PageHeader
        title="Editar Rol"
        subtitle="Actualice la información del rol"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
        }}
      />
      <RoleForm roleId={id} basePath="/settings/roles" />
    </>
  );
}
