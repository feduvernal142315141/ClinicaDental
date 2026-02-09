"use client";

import { PatientForm } from "@/components/patients";
import { SectionTitle } from "@/components/ui/antd";
import { usePatientsPage } from "@/lib/hooks/patients/use-patients-page";

export default function NewPatientPage() {
  const { handleBackToList } = usePatientsPage({
    basePath: "/patients",
  });

  return (
    <>
      <SectionTitle
        title="Nuevo Paciente"
        subtitle="Registre un nuevo paciente en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />
      <PatientForm basePath="/patients" />
    </>
  );
}
