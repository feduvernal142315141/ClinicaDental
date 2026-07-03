"use client";

import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients";
import { PageHeader } from "@/components/ui/layout/page-header";

export default function NewPatientPage() {
  const router = useRouter();

  return (
    <>
      <PageHeader
        title="Nuevo Paciente"
        subtitle="Registre un nuevo paciente en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: () => router.back(),
          variant: "back",
        }}
      />
      <PatientForm basePath="/patients" />
    </>
  );
}
