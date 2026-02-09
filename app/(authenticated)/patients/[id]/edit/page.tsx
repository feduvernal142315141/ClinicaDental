"use client";

import { use } from "react";
import { PatientForm } from "@/components/patients";
import { SectionTitle } from "@/components/ui/antd";
import { usePatientsPage } from "@/lib/hooks/patients/use-patients-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPatientPage({ params }: PageProps) {
  const { id } = use(params);
  const { handleBackToList } = usePatientsPage({
    basePath: "/patients",
  });

  return (
    <>
      <SectionTitle
        title="Editar Paciente"
        subtitle="Actualice la información del paciente en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />
      <PatientForm patientId={id} basePath="/patients" />
    </>
  );
}
