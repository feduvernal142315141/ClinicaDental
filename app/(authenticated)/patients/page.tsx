"use client";

import { PatientList } from "@/components/patients";
import { SectionTitle } from "@/components/ui/antd";
import { usePatientsPage } from "@/lib/hooks/patients/use-patients-page";

export default function PatientsPage() {
  const { handleNewPatient } = usePatientsPage({ basePath: "/patients" });

  return (
    <>
      <SectionTitle
        title="Gestión de Pacientes"
        subtitle="Administre los pacientes del sistema"
        actionButton={{
          label: "Nuevo Paciente",
          onClick: handleNewPatient,
        }}
      />
      <PatientList basePath="/patients" />
    </>
  );
}
