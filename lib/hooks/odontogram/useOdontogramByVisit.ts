"use client";

import { useState, useCallback } from "react";
import { odontogramService } from "@/lib/services/odontogram/odontogram.service";
import { notifyApiError } from "@/lib/utils/notify-error";
import type { OdontogramVisitSnapshot } from "@/lib/entity/odontogram";

export function useOdontogramByVisit(visitId?: string) {
  const [snapshot, setSnapshot] = useState<OdontogramVisitSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (vid: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await odontogramService.getOdontogramByVisit(vid);
      setSnapshot(data);
    } catch (error) {
      // Limpia el snapshot para no mostrar el odontograma de otra visita como si fuera esta
      setSnapshot(null);
      setError("No se pudo cargar el odontograma de esta visita");
      notifyApiError("No se pudo cargar el odontograma de esta visita", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { snapshot, loading, error, load };
}
