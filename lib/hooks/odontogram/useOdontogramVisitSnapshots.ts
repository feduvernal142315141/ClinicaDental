"use client";

import { useState, useCallback } from "react";
import { odontogramService } from "@/lib/services/odontogram/odontogram.service";
import { notifyApiError } from "@/lib/utils/notify-error";
import type { OdontogramVisitSnapshots } from "@/lib/entity/odontogram";

const EMPTY: OdontogramVisitSnapshots = { start: null, finalSnapshot: null };

/**
 * Carga el comparativo antes/después (snapshots 'start' y 'final') del
 * odontograma de una visita. No bloquea: ante un fallo degrada a vacío.
 */
export function useOdontogramVisitSnapshots() {
  const [snapshots, setSnapshots] =
    useState<OdontogramVisitSnapshots>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (visitId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await odontogramService.getOdontogramVisitSnapshots(visitId);
      setSnapshots(data);
    } catch (error) {
      setSnapshots(EMPTY);
      setError("No se pudo cargar el comparativo del odontograma");
      notifyApiError("No se pudo cargar el comparativo del odontograma", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSnapshots(EMPTY);
    setError(null);
  }, []);

  return { snapshots, loading, error, load, reset };
}
