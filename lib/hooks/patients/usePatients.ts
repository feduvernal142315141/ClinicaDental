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
import { notifyApiError } from "@/lib/utils/notify-error";

/**
 * usePatients Hook
 *
 * Hook for managing patients CRUD operations using the backend API
 */
export function usePatients() {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fetchError, setFetchError] = useState<Error | null>(null);
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
      setFetchError(null);
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
        const err =
          error instanceof Error ? error : new Error("Error desconocido");
        setFetchError(err);
        notifyApiError(
          "No se pudo cargar el listado de pacientes",
          error,
          "Revisa tu conexión e inténtalo de nuevo; si el problema continúa, contacta a soporte.",
        );
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
        notifyApiError(
          "No se pudo cargar el paciente",
          error,
          "Vuelve a intentarlo en unos segundos; si persiste, revisa tu conexión o contacta a soporte.",
        );
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
        notify.success("Paciente creado", {
          description:
            "Ya aparece en el listado y puedes agendarle citas o abrir su historia clínica.",
        });
        return patientId;
      } catch (error: unknown) {
        notifyApiError(
          "No se pudo crear el paciente",
          error,
          "Revisa que los datos estén completos e inténtalo otra vez; si continúa, contacta a soporte.",
        );
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
        notify.success("Paciente actualizado", {
          description: "Los cambios se guardaron y ya están visibles en su ficha.",
        });
        return true;
      } catch (error: unknown) {
        notifyApiError(
          "No se pudo actualizar el paciente",
          error,
          "Tus cambios no se guardaron. Inténtalo de nuevo y, si persiste, contacta a soporte.",
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Delete patient (soft delete / deactivate)
   */
  const deletePatient = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await patientsService.deletePatient(id);
        notify.success("Paciente desactivado", {
          description:
            "Se quitó del listado activo; puedes reactivarlo más adelante si lo necesitas.",
        });
        return true;
      } catch (error: unknown) {
        notifyApiError(
          "No se pudo desactivar el paciente",
          error,
          "El paciente sigue en el listado. Inténtalo de nuevo; si continúa, contacta a soporte.",
        );
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
        notify.success("Paciente activado", {
          description:
            "Vuelve a estar activo y disponible para agendar citas y gestionar su atención.",
        });
        return true;
      } catch (error: unknown) {
        notifyApiError(
          "No se pudo activar el paciente",
          error,
          "El estado no cambió. Inténtalo de nuevo y, si persiste, contacta a soporte.",
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
        notify.success("Paciente restaurado", {
          description:
            "Volvió al listado activo con su información y puedes seguir atendiéndolo.",
        });
        return true;
      } catch (error: unknown) {
        notifyApiError(
          "No se pudo restaurar el paciente",
          error,
          "El paciente sigue eliminado. Inténtalo de nuevo; si continúa, contacta a soporte.",
        );
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
          `Paciente ${active ? "activado" : "desactivado"}`,
          {
            description: active
              ? "Ya está activo y disponible para agendar citas y gestionar su atención."
              : "Quedó inactivo y no aparecerá para agendar; puedes reactivarlo cuando quieras.",
          },
        );
        return true;
      } catch (error: unknown) {
        notifyApiError(
          "No se pudo cambiar el estado del paciente",
          error,
          "El estado no se actualizó. Inténtalo de nuevo y, si persiste, contacta a soporte.",
        );
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
    fetchError,
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
