/**
 * APPOINTMENT DETAILS PAGE WRAPPER (CLIENT COMPONENT)
 *
 * Wrapper component para los detalles de cita
 * Maneja navegación y refresh del lado del cliente
 */

"use client";

import { useRouter } from "next/navigation";
import { AppointmentDetails } from "@/components/appointments/appointment-details";
import { Appointment } from "@/lib/entity/appointment/appointments";

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
