"use client";

import { DoctorsList } from "@/components/doctors";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";

export default function UsersPage() {
  const { t } = useI18n();
  const { handleNewDoctor } = useDoctorsPage({ basePath: "/settings/doctors" });

  return (
    <>
      <PageHeader
        title={t("doctors.page.listTitle")}
        subtitle={t("doctors.page.listDescription")}
        actionButton={{
          label: t("doctors.actions.new"),
          onClick: handleNewDoctor,
        }}
      />
      <DoctorsList basePath="/settings/doctors" />
    </>
  );
}
