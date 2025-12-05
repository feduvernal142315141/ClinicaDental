import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { NewPatientPageClient } from "@/components/patients/new-patient-page-client";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Paciente"
        description="Registra un nuevo paciente en el sistema"
      />

      <NewPatientPageClient />
    </div>
  );
}
