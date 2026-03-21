"use client";

import { useState, useCallback } from "react";
import { App } from "antd";
import { odontogramService } from "@/lib/services/odontogram";
import type {
  SaveOdontogramRequest,
  OdontogramResponse,
  PaginatedOdontogramHistoryResponse,
  PaginatedQueryParams,
} from "@/lib/entity/odontogram";

/**
 * useOdontogram Hook
 *
 * Hook for managing odontogram persistence against the backend API.
 * Provides load, save, and history operations with Ant Design message feedback.
 */
export function useOdontogram() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  /**
   * Get the current odontogram state for a patient.
   * Returns null if the patient has no odontogram yet.
   */
  const getOdontogram = useCallback(
    async (patientId: string): Promise<OdontogramResponse | null> => {
      setLoading(true);
      try {
        return await odontogramService.getOdontogram(patientId);
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Error al cargar el odontograma";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Save (upsert) the complete odontogram state.
   * The backend automatically creates a history snapshot.
   */
  const saveOdontogram = useCallback(
    async (data: SaveOdontogramRequest): Promise<boolean> => {
      setLoading(true);
      try {
        return await odontogramService.saveOdontogram(data);
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al guardar el odontograma";
        message.error(msg);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  /**
   * Get paginated history snapshots for a patient's odontogram.
   */
  const getOdontogramHistory = useCallback(
    async (
      patientId: string,
      params?: PaginatedQueryParams,
    ): Promise<PaginatedOdontogramHistoryResponse> => {
      setLoading(true);
      try {
        return await odontogramService.getOdontogramHistory(patientId, params);
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Error al cargar el historial del odontograma";
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
    getOdontogram,
    saveOdontogram,
    getOdontogramHistory,
  };
}
