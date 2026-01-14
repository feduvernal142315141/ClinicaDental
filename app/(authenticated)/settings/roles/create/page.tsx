"use client";

import { SectionTitle } from "@/components/ui/antd";
import { RoleForm } from "@/components/roles";
import { useRolesPage } from "@/lib/hooks/roles/use-roles-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateRolePage() {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleBackToList } = useRolesPage({ basePath: "/settings/roles" });

  useEffect(() => {
    const allowed = isAdmin || can("role", PermissionAction.CREATE);
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  return (
    <>
      <SectionTitle
        title="Nuevo Rol"
        subtitle="Cree un nuevo rol para el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />
      <RoleForm basePath="/settings/roles" />
    </>
  );
}
