/**
 * NEW APPOINTMENT PAGE WRAPPER (CLIENT COMPONENT)
 *
 * Wrapper component para el formulario de nueva cita
 * Maneja navegación del lado del cliente
 */

"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const AppointmentFormWithSidebar = dynamic(
  () =>
    import("@/components/appointments/appointment-form-with-sidebar").then(
      (mod) => mod.AppointmentFormWithSidebar
    ),
  { loading: () => <LazyLoadingFallback /> }
);

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
