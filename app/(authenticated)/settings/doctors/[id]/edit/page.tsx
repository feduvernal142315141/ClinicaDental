"use client";

import { use } from "react";
import { DoctorForm } from "@/components/doctors";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";

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
      <PageHeader
        title="Editar Usuario"
        subtitle="Actualice la información del usuario en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
        }}
      />
      <DoctorForm doctorId={id} basePath="/settings/doctors" />
    </>
  );
}
