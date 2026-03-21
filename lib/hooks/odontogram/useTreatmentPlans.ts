"use client";

import { useState, useCallback } from "react";
import { App } from "antd";
import { treatmentPlanService } from "@/lib/services/odontogram";
import type {
  CreateTreatmentPlanRequest,
  UpdateTreatmentPlanRequest,
  TreatmentPlanResponse,
  PaginatedQueryParams,
} from "@/lib/entity/odontogram";

/**
 * useTreatmentPlans Hook
 *
 * Hook for managing treatment-plan CRUD against the backend API.
 * Uses Ant Design App.useApp().message for user feedback.
 */
export function useTreatmentPlans() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<TreatmentPlanResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  /**
   * Fetch paginated treatment plans for a patient.
   */
  const fetchPlans = useCallback(
    async (patientId: string, params?: PaginatedQueryParams) => {
      setLoading(true);
      try {
        const response =
          await treatmentPlanService.getTreatmentPlansByPatient(
            patientId,
            params,
          );

        setPlans(response.entities ?? []);
        setPagination({
          page: response.pagination?.page ?? 0,
          pageSize: response.pagination?.pageSize ?? 10,
          total: response.pagination?.total ?? 0,
        });

        return response;
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al cargar los planes de tratamiento";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Get a single treatment plan by ID.
   */
  const getPlan = useCallback(
    async (id: string): Promise<TreatmentPlanResponse | null> => {
      setLoading(true);
      try {
        return await treatmentPlanService.getTreatmentPlan(id);
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al cargar el plan de tratamiento";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Create a new treatment plan.
   * @returns UUID of the created plan.
   */
  const createPlan = useCallback(
    async (data: CreateTreatmentPlanRequest): Promise<string> => {
      setLoading(true);
      try {
        const planId = await treatmentPlanService.createTreatmentPlan(data);
        message.success("Plan de tratamiento creado exitosamente");
        return planId;
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al crear el plan de tratamiento";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Update an existing treatment plan.
   */
  const updatePlan = useCallback(
    async (data: UpdateTreatmentPlanRequest): Promise<boolean> => {
      setLoading(true);
      try {
        await treatmentPlanService.updateTreatmentPlan(data);
        message.success("Plan de tratamiento actualizado exitosamente");
        return true;
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al actualizar el plan de tratamiento";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Cancel a treatment plan.
   */
  const cancelPlan = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        await treatmentPlanService.cancelTreatmentPlan(id);
        message.success("Plan de tratamiento cancelado");
        return true;
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al cancelar el plan de tratamiento";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  return {
    loading,
    plans,
    pagination,
    fetchPlans,
    getPlan,
    createPlan,
    updatePlan,
    cancelPlan,
  } as const;
}
