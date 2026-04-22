"use client";

import { useState, useCallback } from "react";
import { odontogramService } from "@/lib/services/odontogram/odontogram.service";
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
    } catch {
      setError("No se pudo cargar el odontograma de esta visita");
    } finally {
      setLoading(false);
    }
  }, []);

  return { snapshot, loading, error, load };
}
