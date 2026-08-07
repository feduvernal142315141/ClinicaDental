import { useState, useEffect, useRef, useCallback } from "react";
import { notifyApiError } from "@/lib/utils/notify-error";
import {
  fetchServiceTemplates,
  type ServiceTemplateSummary,
} from "../../adapters/service-templates";

export interface UseServiceTemplatesResult {
  templates: ServiceTemplateSummary[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Plantillas de servicios de la clínica para el panel "Plantillas" del tab Plan.
 *
 * Sustituye a `PROCEDURE_TEMPLATES_MOCK`, que traía dos plantillas fijas cuyos
 * pasos apuntaban a procedimientos inexistentes en el catálogo real.
 *
 * Igual que el catálogo: sin fallback. Si falla, se reporta; no se inventan
 * plantillas.
 */
export function useServiceTemplates(): UseServiceTemplatesResult {
  const [templates, setTemplates] = useState<ServiceTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await fetchServiceTemplates());
    } catch (err) {
      notifyApiError("No se pudieron cargar las plantillas de tratamiento", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar las plantillas",
      );
      setTemplates([]);
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

  return { templates, loading, error, reload };
}
