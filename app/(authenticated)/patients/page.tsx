import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { PatientsPageClient } from "@/components/patients/patients-page-client";

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Gestiona la información de tus pacientes"
      />

      <PatientsPageClient />
    </div>
  );
}
