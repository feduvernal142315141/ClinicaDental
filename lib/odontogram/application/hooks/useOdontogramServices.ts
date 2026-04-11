import { useState, useEffect, useRef } from "react";
import { servicesService } from "@/lib/services/services/services.service";
import type { ServiceListItem, ServiceCategory } from "@/lib/entity/services";
import type {
  ProcedureCatalogItem,
  ProcedureCategory,
} from "../../domain/odontogram/types";
import { PROCEDURE_CATALOG_MOCK } from "../../infrastructure/data/mock/procedure-catalog.mock";

/**
 * Maps backend ServiceCategory (uppercase) to frontend ProcedureCategory (lowercase).
 */
function mapCategory(
  backendCategory?: ServiceCategory | null,
): ProcedureCategory {
  if (!backendCategory) return "restaurador";
  const map: Record<string, ProcedureCategory> = {
    RESTAURADOR: "restaurador",
    ENDODONCIA: "endodoncia",
    PROTESIS: "protesis",
    IMPLANTE: "implante",
    PREVENTIVO: "preventivo",
    PERIODONCIA: "periodoncia",
    ESTETICO: "estetico",
    CIRUGIA: "cirugia",
  };
  return map[backendCategory] ?? "restaurador";
}

/**
 * Converts a backend Service into a ProcedureCatalogItem for the odontogram PlanTab.
 */
function serviceToCatalogItem(service: ServiceListItem): ProcedureCatalogItem {
  return {
    id: service.id,
    name: service.name,
    code: service.code,
    category: mapCategory(service.category),
    estimatedDuration: 30,
    baseCost: service.cost ?? 0,
    isFavorite: false,
  };
}

export interface UseOdontogramServicesResult {
  catalog: ProcedureCatalogItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches active odontogram-enabled services from the backend and maps them
 * to ProcedureCatalogItem[]. Falls back to the mock catalog on failure.
 */
export function useOdontogramServices(): UseOdontogramServicesResult {
  const [catalog, setCatalog] = useState<ProcedureCatalogItem[]>(
    PROCEDURE_CATALOG_MOCK,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    setLoading(true);
    servicesService
      .getActiveOdontogramServices()
      .then((services) => {
        if (services.length > 0) {
          setCatalog(services.map(serviceToCatalogItem));
        }
        // If no services from backend, keep mock fallback
        setError(null);
      })
      .catch((err) => {
        console.warn("[useOdontogramServices] Fallback to mock catalog:", err);
        setError(err?.message ?? "Error loading services");
        // catalog stays as PROCEDURE_CATALOG_MOCK
      })
      .finally(() => setLoading(false));
  }, []);

  return { catalog, loading, error };
}
