"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients";
import { PageHeader } from "@/components/ui/layout/page-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPatientPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <>
      <PageHeader
        title="Editar Paciente"
        subtitle="Actualice la información del paciente en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: () => router.back(),
          variant: "back",
        }}
      />
      <PatientForm patientId={id} basePath="/patients" />
    </>
  );
}
