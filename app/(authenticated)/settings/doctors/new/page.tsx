"use client";

import { DoctorForm } from "@/components/doctors";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";

export default function NewUserPage() {
  const { handleBackToList } = useDoctorsPage({
    basePath: "/settings/doctors",
  });

  return (
    <>
      <PageHeader
        title="Nuevo Doctor"
        subtitle="Registre un nuevo doctor en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
        }}
      />
      <DoctorForm basePath="/settings/doctors" />
    </>
  );
}
