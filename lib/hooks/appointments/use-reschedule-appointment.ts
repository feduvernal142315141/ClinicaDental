"use client";

import { useState, useCallback } from "react";

import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { notify } from "@/lib/utils/notify";

interface UseRescheduleAppointmentOptions {
  onSuccess?: () => void;
}

export function useRescheduleAppointment(
  appointmentId: string,
  options?: UseRescheduleAppointmentOptions,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reschedule = useCallback(
    async (data: { scheduledStartAt: string; scheduledEndAt: string }) => {
      setLoading(true);
      setError(null);
      try {
        await appointmentsService.rescheduleAppointment(appointmentId, data);
        notify.success("Cita reagendada", {
          description:
            "La cita quedó programada en el nuevo horario. Avisa al paciente para confirmar su asistencia.",
        });
        options?.onSuccess?.();
      } catch (err) {
        const typedErr = err as { status?: number; message?: string } | null;
        if (typedErr?.status === 409) {
          const msg = "El doctor tiene otra cita en ese horario";
          setError(msg);
          notify.error(msg, {
            description:
              "Ese horario ya está ocupado por otra cita del doctor. Elige uno distinto e inténtalo de nuevo.",
          });
        } else {
          const msg = err instanceof Error ? err.message : "Error al reagendar la cita";
          setError(msg);
          notify.error(msg, {
            description:
              "No pudimos reagendar la cita. Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
          });
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, options],
  );

  return { reschedule, loading, error };
}
