import { useState, useEffect } from "react";
import { ServiceTemplateService } from "@/lib/services/odontogram/service-template.service";
import type { IcdasTemplateSuggestion } from "@/lib/entity/odontogram";

export interface UseIcdasTemplateSuggestionsResult {
  suggestions: IcdasTemplateSuggestion[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches ICDAS-based template suggestions from the backend.
 * Returns an empty array (no error shown) when icdasScore is null.
 *
 * Falls back gracefully to an empty array if the backend is unavailable.
 */
export function useIcdasTemplateSuggestions(
  icdasScore: number | null,
  surface?: string | null,
): UseIcdasTemplateSuggestionsResult {
  const [suggestions, setSuggestions] = useState<IcdasTemplateSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (icdasScore === null || icdasScore === undefined) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    ServiceTemplateService.getIcdasSuggestions(icdasScore, surface)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn(
            "[useIcdasTemplateSuggestions] Backend unavailable, showing empty suggestions.",
            err,
          );
          setError(err?.message ?? "Error cargando plantillas ICDAS");
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [icdasScore, surface]);

  return { suggestions, loading, error };
}
