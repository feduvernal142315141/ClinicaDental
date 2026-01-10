"use client";

import { DoctorsList } from "@/components/doctors";
import { SectionTitle } from "@/components/ui/antd";
import { useDoctorsPage } from "@/lib/hooks/use-doctors-page";

export default function UsersPage() {
  const { handleNewDoctor } = useDoctorsPage({ basePath: "/settings/doctors" });

  return (
    <>
      <SectionTitle
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
