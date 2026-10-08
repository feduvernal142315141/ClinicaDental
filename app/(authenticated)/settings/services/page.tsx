"use client";

import { PageHeader } from "@/components/ui/layout/page-header";
import { ServicesList } from "@/components/features/services";
import { useServicesPage } from "@/lib/hooks/services/use-services-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function ServicesSettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleNewService } = useServicesPage({
    basePath: "/settings/services",
  });

  useEffect(() => {
    const allowed =
      isAdmin ||
      can("service", PermissionAction.CREATE) ||
      can("service", PermissionAction.EDIT) ||
      can("service", PermissionAction.DELETE) ||
      can("service", PermissionAction.BLOCK);

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  const canCreate = isAdmin || can("service", PermissionAction.CREATE);

  return (
    <>
      <PageHeader
        title={t("services.page.title")}
        subtitle={t("services.page.description")}
        actionButton={
          canCreate
            ? {
                label: t("services.actions.new"),
                onClick: handleNewService,
              }
            : undefined
        }
      />
      <ServicesList basePath="/settings/services" />
    </>
  );
}
