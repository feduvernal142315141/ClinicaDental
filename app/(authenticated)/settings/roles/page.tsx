"use client";

import { PageHeader } from "@/components/ui/layout/page-header";
import { RolesList } from "@/components/roles";
import { useRolesPage } from "@/lib/hooks/roles/use-roles-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function RolesSettingsPage() {
  const { t } = useI18n();
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
      <PageHeader
        title={t("roles.page.title")}
        subtitle={t("roles.page.description")}
        actionButton={
          canCreate
            ? {
                label: t("roles.actions.new"),
                onClick: handleNewRole,
              }
            : undefined
        }
      />
      <RolesList basePath="/settings/roles" />
    </>
  );
}
