import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { EditPatientPageClient } from "@/components/patients";
import { usePatientDetails } from "@/hooks/use-patient-details";

export default async function EditPatientPage({
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
        title="Editar Paciente"
        description="Actualiza la información del paciente"
      />

      <EditPatientPageClient patient={patient} />
    </div>
  );
}
