import { useState, useCallback } from "react";

import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type {
  ClinicalHistorySnapshot,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import { notify } from "@/lib/utils/notify";

export function useClinicalHistory() {
  const [snapshot, setSnapshot] = useState<ClinicalHistorySnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const loadSnapshot = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    setForbidden(false);
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

  const updateMedicalHistory = useCallback(
    async (patientId: string, data: UpdateMedicalHistoryRequest) => {
      setLoading(true);
      try {
        await clinicalHistoryService.updateMedicalHistory(patientId, data);
        notify.success("Historia médica actualizada", {
          description:
            "Los antecedentes del paciente quedaron guardados y ya se reflejan en su historia clínica.",
        });
        await loadSnapshot(patientId);
        return true;
      } catch (err: unknown) {
        notify.error(err.message || "Error al actualizar historia médica", {
          description:
            "No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo; si continúa, contacta a soporte.",
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadSnapshot],
  );

  return {
    snapshot,
    loading,
    error,
    forbidden,
    loadSnapshot,
    updateMedicalHistory,
  };
}
