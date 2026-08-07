import { useState, useEffect, useRef, useCallback } from "react";
import { notifyApiError } from "@/lib/utils/notify-error";
import { fetchServiceCatalog } from "../../adapters/service-catalog";
import type { ProcedureCatalogItem } from "../../domain/odontogram/types";

export interface UseOdontogramServicesResult {
  catalog: ProcedureCatalogItem[];
  loading: boolean;
  error: string | null;
  /** Reintento manual, para el estado de error del panel. */
  reload: () => void;
}

/**
 * Catálogo de procedimientos del odontograma: los servicios de la clínica
 * marcados como visibles en el odontograma.
 *
 * SIN CATÁLOGO DE RESERVA. La versión anterior arrancaba con
 * `PROCEDURE_CATALOG_MOCK` y se quedaba con él si la petición fallaba o si el
 * backend devolvía cero servicios ("keep mock fallback"). Eso presentaba
 * procedimientos y precios inventados como si fueran los de la clínica, sin
 * ninguna señal, y el odontólogo podía presupuestar con ellos. Ahora un fallo
 * es un fallo (`error`) y un catálogo vacío es un catálogo vacío: el panel debe
 * decirlo, no rellenarlo.
 */
export function useOdontogramServices(): UseOdontogramServicesResult {
  const [catalog, setCatalog] = useState<ProcedureCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evita re-disparar la carga en cada render; `reload` la fuerza a propósito.
  const fetched = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await fetchServiceCatalog());
    } catch (err) {
      notifyApiError("No se pudieron cargar los servicios del odontograma", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar los servicios",
      );
      // El catálogo se deja vacío a propósito: mejor no poder planificar que
      // planificar sobre datos que no son de esta clínica.
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void load();
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return { catalog, loading, error, reload };
}
