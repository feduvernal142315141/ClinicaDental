"use client";

import { useState } from "react";
import { CalendarView } from "@/components/appointments/calendar-view";
import { AppointmentFormWithSidebar } from "@/components/appointments/appointment-form-with-sidebar";
import { AppointmentDetails } from "@/components/appointments/appointment-details";
import { Appointment } from "@/lib/entity/appointment/appointments";

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Citas</h1>
        <p className="text-muted-foreground">
          Gestiona las citas de tus pacientes
        </p>
      </div>

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
