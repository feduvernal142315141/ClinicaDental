"use client";

import { SummaryCard } from "@/components/ui/atomic/data-display/summary-card";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { MiniCalendar } from "./MiniCalendar";
import { useAppointmentFormSummary } from "@/lib/hooks/use-appointment-form-summary";

interface AppointmentFormWithSidebarProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AppointmentFormWithSidebar({
  onSuccess,
  onCancel,
}: AppointmentFormWithSidebarProps) {
  const { formData, summaryItems, handleFormChange, handleDateSelect } =
    useAppointmentFormSummary();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <div>
        <AppointmentForm
          onSuccess={onSuccess}
          onCancel={onCancel}
          // 👇 paso un callback para que el form avise cambios
          //onChange={handleFormChange}
        />
      </div>

      <div className="space-y-6">
        <SummaryCard title="Resumen de la cita" items={summaryItems} />

        <MiniCalendar
          doctorId={formData.doctor_id}
          onDateSelect={handleDateSelect}
        />
      </div>
    </div>
  );
}
