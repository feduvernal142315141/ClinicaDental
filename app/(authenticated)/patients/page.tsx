"use client";

import { PatientList } from "@/components/patients";
import { PageHeader } from "@/components/ui/layout/page-header";
import { usePatientsPage } from "@/lib/hooks/patients/use-patients-page";

export default function PatientsPage() {
  const { handleNewPatient } = usePatientsPage({ basePath: "/patients" });

  return (
    <>
      <PageHeader
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
