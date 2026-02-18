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
  const { message, modal } = App.useApp();

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
    } catch (error) {
      setAppointments([]);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al cargar citas del doctor";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [doctorId, date, message]);

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
            message.success("Cita cancelada exitosamente");
            await fetchAppointments();
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Error al cancelar la cita";
            message.error(errorMessage);
          }
        },
      });
    },
    [modal, message, fetchAppointments],
  );

  return {
    appointments,
    loading,
    refreshAppointments: fetchAppointments,
    cancelAppointment,
  };
}
