import { useCallback, useEffect, useState } from "react";
import { App } from "antd";
import { appointmentsService } from "@/lib/services/appointments";
import type { Appointment } from "@/lib/entity/appointment";

interface UseDoctorAppointmentsParams {
  doctorId: string;
  date: string;
}

/**
 * Hook que gestiona las citas agendadas de un doctor para una fecha.
 * Consume GET /appointments/doctor/{doctorId}?date= y PATCH /appointments/{id}/cancel.
 */
export function useDoctorAppointments({
  doctorId,
  date,
}: UseDoctorAppointmentsParams) {
  const { modal } = App.useApp();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!doctorId || !date) {
      setAppointments([]);
      return;
    }

    setLoading(true);
    try {
      const data = await appointmentsService.getDoctorAppointments(
        doctorId,
        date,
      );
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const cancelAppointment = useCallback(
    (appointment: Appointment) => {
      modal.confirm({
        title: "¿Cancelar cita?",
        content: `Se cancelará la cita de ${appointment.patientName ?? "paciente"} a las ${appointment.time || "--:--"}.`,
        okText: "Cancelar cita",
        okType: "danger",
        cancelText: "Volver",
        onOk: async () => {
          try {
            await appointmentsService.cancelAppointment(appointment.id);
            await fetchAppointments();
          } catch {
            // Error notification handled by interceptor (Sonner toast)
          }
        },
      });
    },
    [modal, fetchAppointments],
  );

  return {
    appointments,
    loading,
    refreshAppointments: fetchAppointments,
    cancelAppointment,
  };
}
