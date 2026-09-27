"use client";

import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function NewPatientPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        title={t("patients.form.newTitle")}
        subtitle={t("patients.form.newDescription")}
        actionButton={{
          label: t("patients.actions.back"),
          onClick: () => router.back(),
          variant: "back",
        }}
      />
      <PatientForm basePath="/patients" />
    </>
  );
}
