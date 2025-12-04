"use client";

import { useRouter } from "next/navigation";
import { CalendarView } from "@/components/appointments/calendar-view";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";

export default function AppointmentsPage() {
  const router = useRouter();

  const handleNewAppointment = () => {
    router.push("/appointments/new");
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    router.push(`/appointments/${appointment.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        description="Gestiona las citas de tus pacientes"
      />

      <CalendarView
        onNewAppointment={handleNewAppointment}
        onAppointmentClick={handleAppointmentClick}
      />
    </div>
  );
}
