"use client";

import { useState, useCallback } from "react";
import { App } from "antd";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import type { CancellationReasonCode } from "@/lib/entity/appointment";

interface UseCancelAppointmentOptions {
  onSuccess?: () => void;
}

export function useCancelAppointment(
  appointmentId: string,
  options?: UseCancelAppointmentOptions,
) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(
    async (data?: { reason?: string; reasonCode?: CancellationReasonCode }) => {
      setLoading(true);
      setError(null);
      try {
        await appointmentsService.cancelAppointment(appointmentId, data);
        message.success("Cita cancelada");
        options?.onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al cancelar la cita";
        setError(msg);
        message.error(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, message, options],
  );

  return { cancel, loading, error };
}
