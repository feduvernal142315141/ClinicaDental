import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { AppointmentDetailsPageClient } from "@/components/appointments/appointment-details-page-client";
import { useAppointmentDetails } from "@/lib/hooks/use-appointment-details";

export default async function AppointmentDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const appointment = await useAppointmentDetails(params.id);

  if (!appointment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalles de la Cita"
        description="Información completa de la cita"
      />

      <AppointmentDetailsPageClient appointment={appointment} />
    </div>
  );
}
