"use client";

import { PatientList } from "@/components/patients";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useI18n } from "@/lib/contexts/i18n-context";
import { usePatientsPage } from "@/lib/hooks/patients/use-patients-page";

export default function PatientsPage() {
  const { t } = useI18n();
  const { handleNewPatient } = usePatientsPage({ basePath: "/patients" });

  return (
    <>
      <PageHeader
        title={t("patients.page.title")}
        subtitle={t("patients.page.description")}
        actionButton={{
          label: t("patients.actions.new"),
          onClick: handleNewPatient,
        }}
      />
      <PatientList basePath="/patients" />
    </>
  );
}
