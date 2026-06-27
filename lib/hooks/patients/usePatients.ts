import { useState, useCallback } from "react";

import { patientsService } from "@/lib/services/patients";
import type {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientsQueryParams,
  PaginatedPatientsResponse,
} from "@/lib/entity/patients";
import { notify } from "@/lib/utils/notify";

/**
 * usePatients Hook
 *
 * Hook for managing patients CRUD operations using the backend API
 */
export function usePatients() {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  /**
   * Fetch paginated patients list
   */
  const fetchPatients = useCallback(
    async (params?: PatientsQueryParams) => {
      setLoading(true);
      try {
        const response: PaginatedPatientsResponse =
          await patientsService.getPatients(params);

        // Backend returns { entities: Patient[], pagination: { page, pageSize, total } }
        // pageSize is sourced from the request params, not the backend echo,
        // because some backends return the actual result count as pageSize.
        setPatients(response.entities ?? []);
        setPagination((prev) => ({
          page: response.pagination?.page ?? 0,
          pageSize: params?.pageSize ?? prev.pageSize,
          total: response.pagination?.total ?? 0,
        }));

        return response;
      } catch (error: unknown) {
        notify.error(error.message || "Error al cargar pacientes");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get patient by ID
   */
  const getPatientById = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const patient = await patientsService.getPatientById(id);
        return patient;
      } catch (error: unknown) {
        notify.error(error.message || "Error al cargar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create new patient
   * @returns UUID of the created patient
   */
  const createPatient = useCallback(
    async (data: CreatePatientRequest) => {
      setLoading(true);
      try {
        const patientId = await patientsService.createPatient(data);
        notify.success("Paciente creado exitosamente");
        return patientId;
      } catch (error: unknown) {
        notify.error(error.message || "Error al crear paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update existing patient
   */
  const updatePatient = useCallback(
    async (data: UpdatePatientRequest) => {
      setLoading(true);
      try {
        await patientsService.updatePatient(data);
        notify.success("Paciente actualizado exitosamente");
        return true;
      } catch (error: unknown) {
        notify.error(error.message || "Error al actualizar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Delete patient (soft delete)
   */
  const deletePatient = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await patientsService.deletePatient(id);
        notify.success("Paciente eliminado exitosamente");
        return true;
      } catch (error: unknown) {
        notify.error(error.message || "Error al eliminar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Activate a patient via the dedicated PATCH endpoint
   */
  const activatePatient = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await patientsService.activatePatient(id);
        notify.success("Paciente activado exitosamente");
        return true;
      } catch (error: unknown) {
        notify.error(
          (error as Error).message || "Error al activar paciente",
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Restore a deleted patient
   */
  const restorePatient = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await patientsService.restorePatient(id);
        notify.success("Paciente restaurado exitosamente");
        return true;
      } catch (error: unknown) {
        notify.error(error.message || "Error al restaurar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Toggle patient active status
   */
  const togglePatientStatus = useCallback(
    async (id: string, active: boolean) => {
      setLoading(true);
      try {
        await patientsService.updatePatient({ id, active });
        notify.success(
          `Paciente ${active ? "activado" : "desactivado"} exitosamente`,
        );
        return true;
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
    patients,
    pagination,
    fetchPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    activatePatient,
    restorePatient,
    togglePatientStatus,
  };
}
