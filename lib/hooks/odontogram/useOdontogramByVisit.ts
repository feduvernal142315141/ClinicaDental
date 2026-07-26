"use client";

import { useState, useCallback, useRef } from "react";
import { odontogramService } from "@/lib/services/odontogram/odontogram.service";
import { notifyApiError } from "@/lib/utils/notify-error";
import type { OdontogramVisitSnapshot } from "@/lib/entity/odontogram";

/**
 * Carga el snapshot del odontograma de una visita concreta. La visita se pasa
 * a `load`, no al hook: el anfitrión decide cuándo pedirla.
 */
export function useOdontogramByVisit() {
  const [snapshot, setSnapshot] = useState<OdontogramVisitSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Visita a la que corresponde el snapshot que hay en estado. El anfitrión la
   * usa para no retirar el spinner hasta que lo pintado es de verdad la visita
   * pedida.
   */
  const [loadedVisitId, setLoadedVisitId] = useState<string | undefined>(
    undefined,
  );

  /**
   * Guarda de concurrencia: solo la ÚLTIMA petición lanzada puede escribir en
   * el estado. Sin esto, una respuesta lenta de la visita A pisaba a la de B y
   * el clínico veía el odontograma de una visita bajo la fecha de otra — que
   * en un registro clínico-legal no es un parpadeo, es un dato falso.
   */
  const currentRequestRef = useRef<string | null>(null);

  const load = useCallback(async (vid: string) => {
    currentRequestRef.current = vid;
    setLoading(true);
    setError(null);
    try {
      const data = await odontogramService.getOdontogramByVisit(vid);
      if (currentRequestRef.current !== vid) return; // respuesta obsoleta
      setSnapshot(data);
      setLoadedVisitId(vid);
    } catch (error) {
      if (currentRequestRef.current !== vid) return; // respuesta obsoleta
      // Limpia el snapshot para no mostrar el odontograma de otra visita como si fuera esta
      setSnapshot(null);
      setLoadedVisitId(vid);
      setError("No se pudo cargar el odontograma de esta visita");
      notifyApiError("No se pudo cargar el odontograma de esta visita", error);
    } finally {
      if (currentRequestRef.current === vid) {
        setLoading(false);
      }
    }
  }, []);

  return { snapshot, loading, error, load, loadedVisitId };
}
