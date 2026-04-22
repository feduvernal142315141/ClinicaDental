"use client";

import { useState, useCallback } from "react";
import { App } from "antd";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";

interface UseRescheduleAppointmentOptions {
  onSuccess?: () => void;
}

export function useRescheduleAppointment(
  appointmentId: string,
  options?: UseRescheduleAppointmentOptions,
) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reschedule = useCallback(
    async (data: { scheduledStartAt: string; scheduledEndAt: string }) => {
      setLoading(true);
      setError(null);
      try {
        await appointmentsService.rescheduleAppointment(appointmentId, data);
        message.success("Cita reagendada exitosamente");
        options?.onSuccess?.();
      } catch (err) {
        const typedErr = err as { status?: number; message?: string } | null;
        if (typedErr?.status === 409) {
          const msg = "El doctor tiene otra cita en ese horario";
          setError(msg);
          message.error(msg);
        } else {
          const msg = err instanceof Error ? err.message : "Error al reagendar la cita";
          setError(msg);
          message.error(msg);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, message, options],
  );

  return { reschedule, loading, error };
}
