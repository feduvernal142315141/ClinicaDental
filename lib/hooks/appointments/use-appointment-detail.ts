import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import type { Appointment } from "@/lib/entity/appointment";

interface UseAppointmentDetailOptions {
  appointmentId: string;
  basePath?: string;
}

export function useAppointmentDetail({
  appointmentId,
  basePath = "/appointments",
}: UseAppointmentDetailOptions) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    appointmentsService
      .getAppointmentById(appointmentId)
      .then((data) => {
        if (!cancelled) {
          setAppointment(data);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Error al cargar la cita");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const handleBack = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    appointment,
    loading,
    error,
    handleBack,
  };
}
