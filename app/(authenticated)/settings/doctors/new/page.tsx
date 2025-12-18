"use client";

import { DoctorForm } from "@/components/doctors";
import { SectionTitle } from "@/components/ui/antd";
import { useDoctorsPage } from "@/hooks/use-doctors-page";

export default function NewUserPage() {
  const { handleBackToList } = useDoctorsPage({
    basePath: "/settings/doctors",
  });

  return (
    <>
      <SectionTitle
        title="Nuevo Doctor"
        subtitle="Registre un nuevo doctor en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />
      <DoctorForm basePath="/settings/doctors" />
    </>
  );
}
