/**
 * APPOINTMENT DETAILS PAGE WRAPPER (CLIENT COMPONENT)
 *
 * Wrapper component para los detalles de cita
 * Maneja navegación y refresh del lado del cliente
 */

"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const AppointmentDetails = dynamic(
  () =>
    import("@/components/appointments/appointment-details").then(
      (mod) => mod.AppointmentDetails
    ),
  { loading: () => <LazyLoadingFallback /> }
);

interface AppointmentDetailsPageClientProps {
  appointment: Appointment;
}

export function AppointmentDetailsPageClient({
  appointment,
}: AppointmentDetailsPageClientProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push("/appointments");
  };

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <AppointmentDetails
      appointment={appointment}
      onClose={handleClose}
      onUpdate={handleUpdate}
    />
  );
}
