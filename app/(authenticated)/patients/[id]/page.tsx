import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { PatientDetailsPageClient } from "@/components/patients";
import { usePatientDetails } from "@/lib/hooks/use-patient-details";

export default async function PatientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await usePatientDetails(id);

  if (!patient) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalles del Paciente"
        description="Información completa del paciente"
      />

      <PatientDetailsPageClient patient={patient} />
    </div>
  );
}
