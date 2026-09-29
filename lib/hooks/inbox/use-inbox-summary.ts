"use client";

import { useCallback, useEffect, useState } from "react";
import type { InboxSummary } from "@/lib/entity/inbox";
import { getInboxSummary } from "@/lib/services/inbox/inbox.service";

interface UseInboxSummaryResult {
  summary: InboxSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useInboxSummary(): UseInboxSummaryResult {
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInboxSummary();
      setSummary(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar resumen",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /** Silent refresh — does NOT reset loading (ideal for polling). */
  const refresh = useCallback(async () => {
    try {
      const result = await getInboxSummary();
      setSummary(result);
    } catch {
      // Silent — polling errors should not disrupt the UI
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { summary, loading, error, refresh };
}
