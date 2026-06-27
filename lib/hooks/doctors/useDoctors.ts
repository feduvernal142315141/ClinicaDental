import { useState, useCallback } from "react";

import { doctorsService } from "@/lib/services/doctors";
import type {
  Doctor,
  CreateDoctorRequest,
  UpdateDoctorRequest,
  DoctorsQueryParams,
  PaginatedDoctorsResponse,
} from "@/lib/entity/doctors";
import { notify } from "@/lib/utils/notify";

/**
 * useDoctors Hook
 *
 * Hook for managing doctors CRUD operations
 */
export function useDoctors() {
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
        // pageSize is sourced from the request params, not the backend echo,
        // because some backends return the actual result count as pageSize.
        setDoctors(response.entities);
        setPagination((prev) => ({
          page: response.pagination.page,
          pageSize: params?.pageSize ?? prev.pageSize,
          total: response.pagination.total,
        }));

        return response;
      } catch (error: unknown) {
        notify.error(error.message || "Error al cargar doctores");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
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
      } catch (error: unknown) {
        notify.error(error.message || "Error al cargar doctor");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create new doctor
   */
  const createDoctor = useCallback(async (data: CreateDoctorRequest) => {
    setLoading(true);
    try {
      const newDoctor = await doctorsService.createDoctor(data);
      return newDoctor;
    } catch (error: unknown) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update existing doctor
   */
  const updateDoctor = useCallback(
    async (id: string, data: UpdateDoctorRequest) => {
      setLoading(true);
      try {
        const updatedDoctor = await doctorsService.updateDoctor(id, data);
        return updatedDoctor;
      } catch (error: unknown) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Delete doctor
   */
  const deleteDoctor = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await doctorsService.deleteDoctor(id);
        notify.success("Doctor eliminado exitosamente");
      } catch (error: unknown) {
        notify.error(error.message || "Error al eliminar doctor");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Toggle doctor active status
   */
  const toggleDoctorStatus = useCallback(
    async (id: string, active: boolean) => {
      setLoading(true);
      try {
        await doctorsService.updateDoctor(id, { active });
        notify.success(
          `Doctor ${active ? "activado" : "desactivado"} exitosamente`,
        );
      } catch (error: unknown) {
        notify.error(error.message || "Error al cambiar estado");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
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
