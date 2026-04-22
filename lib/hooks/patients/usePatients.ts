import { useState, useCallback } from "react";
import { App } from "antd";
import { patientsService } from "@/lib/services/patients";
import type {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientsQueryParams,
  PaginatedPatientsResponse,
} from "@/lib/entity/patients";

/**
 * usePatients Hook
 *
 * Hook for managing patients CRUD operations using the backend API
 */
export function usePatients() {
  const { message } = App.useApp();
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
        message.error(error.message || "Error al cargar pacientes");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
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
        message.error(error.message || "Error al cargar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
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
        message.success("Paciente creado exitosamente");
        return patientId;
      } catch (error: unknown) {
        message.error(error.message || "Error al crear paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Update existing patient
   */
  const updatePatient = useCallback(
    async (data: UpdatePatientRequest) => {
      setLoading(true);
      try {
        await patientsService.updatePatient(data);
        message.success("Paciente actualizado exitosamente");
        return true;
      } catch (error: unknown) {
        message.error(error.message || "Error al actualizar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Delete patient (soft delete)
   */
  const deletePatient = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await patientsService.deletePatient(id);
        message.success("Paciente eliminado exitosamente");
        return true;
      } catch (error: unknown) {
        message.error(error.message || "Error al eliminar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Restore a deleted patient
   */
  const restorePatient = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await patientsService.restorePatient(id);
        message.success("Paciente restaurado exitosamente");
        return true;
      } catch (error: unknown) {
        message.error(error.message || "Error al restaurar paciente");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Toggle patient active status
   */
  const togglePatientStatus = useCallback(
    async (id: string, active: boolean) => {
      setLoading(true);
      try {
        await patientsService.updatePatient({ id, active });
        message.success(
          `Paciente ${active ? "activado" : "desactivado"} exitosamente`,
        );
        return true;
      } catch (error: unknown) {
        message.error(error.message || "Error al cambiar estado");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
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
    restorePatient,
    togglePatientStatus,
  };
}
