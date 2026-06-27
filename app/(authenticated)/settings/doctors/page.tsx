"use client";

import { DoctorsList } from "@/components/doctors";
import { PageHeader } from "@/components/ui/layout/page-header";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";

export default function UsersPage() {
  const { handleNewDoctor } = useDoctorsPage({ basePath: "/settings/doctors" });

  return (
    <>
      <PageHeader
        title="Gestión de Doctores"
        subtitle="Administre los doctores del sistema"
        actionButton={{
          label: "Nuevo Doctor",
          onClick: handleNewDoctor,
        }}
      />
      <DoctorsList basePath="/settings/doctors" />
    </>
  );
}
