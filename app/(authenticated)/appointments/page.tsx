import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { AppointmentsPageClient } from "@/components/appointments/appointments-page-client";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        description="Gestiona las citas de tus pacientes"
      />

      <AppointmentsPageClient />
    </div>
  );
}
