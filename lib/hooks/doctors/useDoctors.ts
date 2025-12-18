import { useState, useCallback } from "react";
import { App } from "antd";
import { doctorsService } from "@/lib/services/doctors";
import type {
  Doctor,
  CreateDoctorRequest,
  UpdateDoctorRequest,
  DoctorsQueryParams,
  PaginatedDoctorsResponse,
} from "@/lib/entity/doctors";

/**
 * useDoctors Hook
 *
 * Hook for managing doctors CRUD operations
 */
export function useDoctors() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  /**
   * Fetch paginated doctors list
   */
  const fetchDoctors = useCallback(
    async (params?: DoctorsQueryParams) => {
      setLoading(true);
      try {
        const response: PaginatedDoctorsResponse =
          await doctorsService.getDoctors(params);

        // Backend returns { entities: Doctor[], pagination: {...} }
        setDoctors(response.entities);
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
        });

        return response;
      } catch (error: any) {
        message.error(error.message || "Error al cargar doctores");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Get doctor by ID
   */
  const getDoctorById = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const doctor = await doctorsService.getDoctorById(id);
        return doctor;
      } catch (error: any) {
        message.error(error.message || "Error al cargar doctor");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Create new doctor
   */
  const createDoctor = useCallback(
    async (data: CreateDoctorRequest) => {
      setLoading(true);
      try {
        const newDoctor = await doctorsService.createDoctor(data);
        return newDoctor;
      } catch (error: any) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update existing doctor
   */
  const updateDoctor = useCallback(
    async (id: string, data: UpdateDoctorRequest) => {
      setLoading(true);
      try {
        const updatedDoctor = await doctorsService.updateDoctor(id, data);
        return updatedDoctor;
      } catch (error: any) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete doctor
   */
  const deleteDoctor = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await doctorsService.deleteDoctor(id);
        message.success("Doctor eliminado exitosamente");
      } catch (error: any) {
        message.error(error.message || "Error al eliminar doctor");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Toggle doctor active status
   */
  const toggleDoctorStatus = useCallback(
    async (id: string, active: boolean) => {
      setLoading(true);
      try {
        await doctorsService.updateDoctor(id, { active });
        message.success(
          `Doctor ${active ? "activado" : "desactivado"} exitosamente`
        );
      } catch (error: any) {
        message.error(error.message || "Error al cambiar estado");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  return {
    loading,
    doctors,
    pagination,
    fetchDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    toggleDoctorStatus,
  };
}
