"use client";

import { use } from "react";
import { DoctorForm } from "@/components/doctors";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";
import { useI18n } from "@/lib/contexts/i18n-context";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDoctorPage({ params }: PageProps) {
  const { id } = use(params);
  const { t } = useI18n();
  const { handleBackToList } = useDoctorsPage({
    basePath: "/settings/doctors",
  });

  return (
    <>
      <PageHeader
        title={t("doctors.page.editTitle")}
        subtitle={t("doctors.page.editDescription")}
        actionButton={{
          label: t("patients.actions.back"),
          onClick: handleBackToList,
          variant: "back",
        }}
      />
      <DoctorForm doctorId={id} basePath="/settings/doctors" />
    </>
  );
}
