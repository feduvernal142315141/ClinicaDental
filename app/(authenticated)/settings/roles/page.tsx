"use client";

import { SectionTitle } from "@/components/ui/antd";
import { RolesList } from "@/components/roles";
import { useRolesPage } from "@/lib/hooks/roles/use-roles-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RolesSettingsPage() {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleNewRole } = useRolesPage({ basePath: "/settings/roles" });

  useEffect(() => {
    const allowed =
      isAdmin ||
      can("role", PermissionAction.CREATE) ||
      can("role", PermissionAction.EDIT) ||
      can("role", PermissionAction.DELETE) ||
      can("role", PermissionAction.BLOCK);

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  const canCreate = isAdmin || can("role", PermissionAction.CREATE);

  return (
    <>
      <SectionTitle
        title="Gestión de Roles"
        subtitle="Administre los roles del sistema"
        actionButton={
          canCreate
            ? {
                label: "Nuevo Rol",
                onClick: handleNewRole,
              }
            : undefined
        }
      />
      <RolesList basePath="/settings/roles" />
    </>
  );
}
