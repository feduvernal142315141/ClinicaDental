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
        notify.error(error.message || "No se pudo cargar el listado de doctores", {
          description:
            "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
        });
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
        notify.error(error.message || "No se pudo cargar el doctor", {
          description:
            "No fue posible obtener los datos del doctor. Vuelve a intentarlo en unos segundos.",
        });
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
      notify.success("Doctor creado", {
        description:
          "El doctor ya aparece en el listado y está disponible para agendar citas.",
      });
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
        notify.success("Doctor actualizado", {
          description:
            "Los cambios del doctor se guardaron y ya están disponibles en el listado.",
        });
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
        notify.success("Doctor eliminado", {
          description:
            "El doctor ya no aparece en el listado ni estará disponible para agendar nuevas citas.",
        });
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo eliminar el doctor", {
          description:
            "Inténtalo de nuevo; si el doctor tiene citas asociadas, revísalas antes de continuar.",
        });
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
          `Doctor ${active ? "activado" : "desactivado"}`,
          {
            description: active
              ? "El doctor vuelve a estar disponible para agendar citas."
              : "El doctor queda inactivo y no se le podrán agendar nuevas citas.",
          },
        );
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo cambiar el estado del doctor", {
          description:
            "Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
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
