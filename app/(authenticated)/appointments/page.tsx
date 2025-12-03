"use client";

import { useState } from "react";
import { CalendarView } from "@/components/appointments/calendar-view";
import { AppointmentFormWithSidebar } from "@/components/appointments/appointment-form-with-sidebar";
import { AppointmentDetails } from "@/components/appointments/appointment-details";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";

export default function AppointmentsPage() {
  const [view, setView] = useState<"calendar" | "form" | "details">("calendar");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setView("form");
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setView("details");
  };

  const handleBack = () => {
    setSelectedAppointment(null);
    setView("calendar");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        description="Gestiona las citas de tus pacientes"
      />

      {view === "calendar" && (
        <CalendarView
          onNewAppointment={handleNewAppointment}
          onAppointmentClick={handleAppointmentClick}
        />
      )}

      {view === "form" && (
        <AppointmentFormWithSidebar
          onSuccess={handleBack}
          onCancel={handleBack}
        />
      )}

      {view === "details" && selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          onClose={handleBack}
          onUpdate={handleBack}
        />
      )}
    </div>
  );
}
