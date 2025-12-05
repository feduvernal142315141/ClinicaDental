/**
 * NEW APPOINTMENT PAGE WRAPPER (CLIENT COMPONENT)
 *
 * Wrapper component para el formulario de nueva cita
 * Maneja navegación del lado del cliente
 */

"use client";

import { useRouter } from "next/navigation";
import { AppointmentFormWithSidebar } from "@/components/appointments/appointment-form-with-sidebar";

export function NewAppointmentPageClient() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/appointments");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <AppointmentFormWithSidebar
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
