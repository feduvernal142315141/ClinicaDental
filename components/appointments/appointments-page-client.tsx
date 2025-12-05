/**
 * APPOINTMENTS PAGE WRAPPER (CLIENT COMPONENT)
 *
 * Wrapper component que maneja la navegación del lado del cliente
 * Permite que la página principal sea un Server Component
 */

"use client";

import { useRouter } from "next/navigation";
import { CalendarView } from "@/components/appointments/calendar-view";
import { Appointment } from "@/lib/entity/appointment/appointments";

interface AppointmentsPageClientProps {
  // Aquí podríamos pasar datos fetched desde el server si fuera necesario
}

export function AppointmentsPageClient({}: AppointmentsPageClientProps) {
  const router = useRouter();

  const handleNewAppointment = () => {
    router.push("/appointments/new");
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    router.push(`/appointments/${appointment.id}`);
  };

  return (
    <CalendarView
      onNewAppointment={handleNewAppointment}
      onAppointmentClick={handleAppointmentClick}
    />
  );
}
