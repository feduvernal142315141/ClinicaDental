"use client";

import { PageHeader } from "@/components/ui/layout/page-header";
import { ServiceForm } from "@/components/features/services";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function CreateServicePage() {
  const { t } = useI18n();
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
      <PageHeader
        title={t("services.page.newTitle")}
        subtitle={t("services.page.newDescription")}
        actionButton={{
          label: t("services.actions.back"),
          onClick: () => router.push("/settings/services"),
          variant: "back",
        }}
      />
      <ServiceForm basePath="/settings/services" />
    </>
  );
}
