import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { AppointmentsPageClient } from "@/components/appointments/appointments-page-client";

/**
 * APPOINTMENTS PAGE (SERVER COMPONENT)
 *
 * Server Component que renderiza el PageHeader estático
 * y delega la lógica de navegación al Client Component
 */
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
