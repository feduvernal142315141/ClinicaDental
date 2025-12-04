"use client";

import { useRouter } from "next/navigation";
import { AppointmentFormWithSidebar } from "@/components/appointments/appointment-form-with-sidebar";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";

export default function NewAppointmentPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/appointments");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Cita"
        description="Programa una nueva cita para un paciente"
      />

      <AppointmentFormWithSidebar
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
