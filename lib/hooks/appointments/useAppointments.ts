import { useCallback, useState } from "react";
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
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getAppointmentById = useCallback(async (id: string) => {
    // TODO: Keep this flow for compatibility until backend exposes GET /appointments/:id.
    setLoading(true);
    try {
      return await appointmentsService.getAppointmentById(id);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAppointment = useCallback(
    async (data: CreateAppointmentRequest) => {
      setLoading(true);
      try {
        const createdId = await appointmentsService.createAppointment(data);
        return createdId;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateAppointment = useCallback(
    async (id: string, data: UpdateAppointmentRequest) => {
      setLoading(true);
      try {
        const updated = await appointmentsService.updateAppointment(id, data);
        return updated;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateAppointmentStatus = useCallback(
    async (id: string, payload: UpdateAppointmentStatusRequest) => {
      setLoading(true);
      try {
        const result = await appointmentsService.updateAppointmentStatus(
          id,
          payload,
        );
        return result;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const cancelAppointment = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const result = await appointmentsService.cancelAppointment(id);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeAppointment = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const result = await appointmentsService.completeAppointment(id);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDoctorAppointments = useCallback(
    async (doctorId: string, date: string) => {
      setLoading(true);
      try {
        return await appointmentsService.getDoctorAppointments(doctorId, date);
      } catch {
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getDoctorAvailability = useCallback(
    async (doctorId: string, date: string, interval = 15, duration?: number) => {
      try {
        return await appointmentsService.getDoctorAvailability(
          doctorId,
          date,
          interval,
          duration,
        );
      } catch (error) {
        throw error;
      }
    },
    [],
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
    completeAppointment,
    getDoctorAppointments,
    getDoctorAvailability,
  };
}
