import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { NewAppointmentPageClient } from "@/components/appointments/new-appointment-page-client";

export default function NewAppointmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Cita"
        description="Programa una nueva cita para un paciente"
      />

      <NewAppointmentPageClient />
    </div>
  );
}
