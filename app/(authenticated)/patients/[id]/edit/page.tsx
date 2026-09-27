"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useI18n } from "@/lib/contexts/i18n-context";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPatientPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        title={t("patients.form.editTitle")}
        subtitle={t("patients.form.editDescription")}
        actionButton={{
          label: t("patients.actions.back"),
          onClick: () => router.back(),
          variant: "back",
        }}
      />
      <PatientForm patientId={id} basePath="/patients" />
    </>
  );
}
