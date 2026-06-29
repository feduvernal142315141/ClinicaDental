"use client";

import { useState, useCallback } from "react";

import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import type { CancellationReasonCode } from "@/lib/entity/appointment";
import { notify } from "@/lib/utils/notify";

interface UseCancelAppointmentOptions {
  onSuccess?: () => void;
}

export function useCancelAppointment(
  appointmentId: string,
  options?: UseCancelAppointmentOptions,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(
    async (data?: { reason?: string; reasonCode?: CancellationReasonCode }) => {
      setLoading(true);
      setError(null);
      try {
        await appointmentsService.cancelAppointment(appointmentId, data);
        notify.success("Cita cancelada", {
          description:
            "La cita quedó marcada como cancelada y ya no aparece como agendada. Puedes crear una nueva cuando lo necesites.",
        });
        options?.onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al cancelar la cita";
        setError(msg);
        notify.error(msg, {
          description:
            "No pudimos cancelar la cita. Revisa tu conexión e inténtalo de nuevo; si el problema continúa, contacta a soporte.",
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, options],
  );

  return { cancel, loading, error };
}
