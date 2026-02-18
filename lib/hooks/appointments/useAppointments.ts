import { useCallback, useState } from "react";
import { App } from "antd";
import { appointmentsService } from "@/lib/services/appointments";
import type {
  Appointment,
  AppointmentsQueryParams,
  CreateAppointmentRequest,
  PaginatedAppointmentsResponse,
  UpdateAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from "@/lib/entity/appointment";

export function useAppointments() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  const fetchAppointments = useCallback(
    async (params?: AppointmentsQueryParams) => {
      // TODO: Keep this flow for compatibility until backend exposes GET /appointments.
      setLoading(true);
      try {
        const response: PaginatedAppointmentsResponse =
          await appointmentsService.getAppointments(params);

        setAppointments(response.entities ?? []);
        setPagination({
          page: response.pagination?.page ?? 0,
          pageSize: response.pagination?.pageSize ?? 10,
          total: response.pagination?.total ?? 0,
        });

        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al cargar el listado de citas";
        message.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const getAppointmentById = useCallback(
    async (id: string) => {
      // TODO: Keep this flow for compatibility until backend exposes GET /appointments/:id.
      setLoading(true);
      try {
        return await appointmentsService.getAppointmentById(id);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al cargar la cita";
        message.error(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const createAppointment = useCallback(
    async (data: CreateAppointmentRequest) => {
      setLoading(true);
      try {
        const createdId = await appointmentsService.createAppointment(data);
        message.success("Cita creada exitosamente");
        return createdId;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al crear la cita";
        message.error(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const updateAppointment = useCallback(
    async (id: string, data: UpdateAppointmentRequest) => {
      setLoading(true);
      try {
        const updated = await appointmentsService.updateAppointment(id, data);
        message.success("Cita actualizada exitosamente");
        return updated;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al actualizar la cita";
        message.error(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const updateAppointmentStatus = useCallback(
    async (id: string, payload: UpdateAppointmentStatusRequest) => {
      setLoading(true);
      try {
        const result = await appointmentsService.updateAppointmentStatus(
          id,
          payload,
        );
        message.success("Estado de cita actualizado exitosamente");
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al actualizar el estado de la cita";
        message.error(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const cancelAppointment = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const result = await appointmentsService.cancelAppointment(id);
        message.success("Cita cancelada exitosamente");
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al cancelar la cita";
        message.error(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const getDoctorAppointments = useCallback(
    async (doctorId: string, date: string) => {
      setLoading(true);
      try {
        return await appointmentsService.getDoctorAppointments(doctorId, date);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al cargar citas del doctor";
        message.error(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const getDoctorAvailability = useCallback(
    async (doctorId: string, date: string, interval = 15) => {
      try {
        return await appointmentsService.getDoctorAvailability(
          doctorId,
          date,
          interval,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al cargar disponibilidad";
        message.error(errorMessage);
        throw error;
      }
    },
    [message],
  );

  return {
    loading,
    appointments,
    pagination,
    fetchAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    getDoctorAppointments,
    getDoctorAvailability,
  };
}
