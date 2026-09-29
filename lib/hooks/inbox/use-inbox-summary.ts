"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Generation counter: protects refresh against out-of-order REST responses
  const refreshGenRef = useRef(0);

  const fetchData = useCallback(async () => {
    const gen = ++refreshGenRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getInboxSummary();
      if (gen !== refreshGenRef.current) return; // Stale
      setSummary(result);
    } catch (err: unknown) {
      if (gen !== refreshGenRef.current) return;
      setError(
        err instanceof Error ? err.message : "Error al cargar resumen",
      );
    } finally {
      if (gen === refreshGenRef.current) setLoading(false);
    }
  }, []);

  /** Silent refresh — protected by generation counter. */
  const refresh = useCallback(async () => {
    const gen = ++refreshGenRef.current;
    try {
      const result = await getInboxSummary();
      if (gen !== refreshGenRef.current) return; // Stale
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
