import { useState, useCallback, useRef } from "react";
import { App } from "antd";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type {
  ClinicalHistorySnapshot,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";

export function useClinicalHistory() {
  const { message } = App.useApp();
  const [snapshot, setSnapshot] = useState<ClinicalHistorySnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const lastPatientIdRef = useRef<string | null>(null);

  const loadSnapshot = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    lastPatientIdRef.current = patientId;
    try {
      const data = await clinicalHistoryService.getSnapshot(patientId);
      setSnapshot(data);
    } catch (err: unknown) {
      const msg = err.message || "Error al cargar historia clínica";
      setError(msg);
      if (err.status === 403) {
        setForbidden(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (lastPatientIdRef.current) {
      await loadSnapshot(lastPatientIdRef.current);
    }
  }, [loadSnapshot]);

  const updateMedicalHistory = useCallback(
    async (patientId: string, data: UpdateMedicalHistoryRequest) => {
      setLoading(true);
      try {
        await clinicalHistoryService.updateMedicalHistory(patientId, data);
        message.success("Historia médica actualizada exitosamente");
        await loadSnapshot(patientId);
        return true;
      } catch (err: unknown) {
        message.error(err.message || "Error al actualizar historia médica");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [message, loadSnapshot],
  );

  const validateMedicalHistory = useCallback(
    async (patientId: string) => {
      setLoading(true);
      try {
        await clinicalHistoryService.validateMedicalHistory(patientId);
        message.success("Historia médica validada exitosamente");
        await loadSnapshot(patientId);
        return true;
      } catch (err: unknown) {
        message.error(err.message || "Error al validar historia médica");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [message, loadSnapshot],
  );

  return {
    snapshot,
    loading,
    error,
    forbidden,
    loadSnapshot,
    refresh,
    updateMedicalHistory,
    validateMedicalHistory,
  };
}
