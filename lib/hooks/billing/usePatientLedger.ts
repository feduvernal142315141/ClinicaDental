import { useState, useCallback } from "react";
import { billingService } from "@/lib/services/billing";
import type { PatientLedgerResponse } from "@/lib/entity/billing";
import { notify } from "@/lib/utils/notify";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Carga y refresca la cuenta del paciente (ledger).
 */
export function usePatientLedger(patientId: string) {
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<PatientLedgerResponse | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!patientId) return null;
    setLoading(true);
    try {
      const data = await billingService.getPatientLedger(patientId);
      setLedger(data);
      return data;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar la cuenta"), {
        description:
          "No pudimos obtener el estado de cuenta del paciente. Revisa tu conexión e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  return {
    loading,
    ledger,
    fetchLedger,
    setLedger,
  };
}
