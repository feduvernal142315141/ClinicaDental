"use client";

import { use } from "react";
import { DoctorForm } from "@/components/doctors";
import { SectionTitle } from "@/components/ui/antd";
import { useDoctorsPage } from "@/hooks/use-doctors-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDoctorPage({ params }: PageProps) {
  const { id } = use(params);
  const { handleBackToList } = useDoctorsPage({
    basePath: "/settings/doctors",
  });

  return (
    <>
      <SectionTitle
        title="Editar Doctor"
        subtitle="Actualice la información del doctor en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />
      <DoctorForm doctorId={id} basePath="/settings/doctors" />
    </>
  );
}
