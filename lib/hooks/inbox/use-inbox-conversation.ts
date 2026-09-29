"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxConversationDetail } from "@/lib/entity/inbox";
import { getInboxConversationDetail } from "@/lib/services/inbox/inbox.service";

interface UseInboxConversationResult {
  detail: InboxConversationDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useInboxConversation(
  id: string | undefined,
): UseInboxConversationResult {
  const [detail, setDetail] = useState<InboxConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation counter: protects refresh against out-of-order REST responses
  const refreshGenRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const gen = ++refreshGenRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getInboxConversationDetail(id);
      if (gen !== refreshGenRef.current) return; // Stale
      setDetail(result);
    } catch (err: unknown) {
      if (gen !== refreshGenRef.current) return;
      setError(
        err instanceof Error ? err.message : "Error al cargar la conversación",
      );
    } finally {
      if (gen === refreshGenRef.current) setLoading(false);
    }
  }, [id]);

  /** Silent refresh — protected by generation counter. */
  const refresh = useCallback(async () => {
    if (!id) return;
    const gen = ++refreshGenRef.current;
    try {
      const result = await getInboxConversationDetail(id);
      if (gen !== refreshGenRef.current) return; // Stale
      setDetail(result);
    } catch {
      // Silent — polling errors should not disrupt the UI
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { detail, loading, error, refresh };
}
