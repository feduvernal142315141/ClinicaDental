"use client";

import { useCallback, useEffect, useState } from "react";
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

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getInboxConversationDetail(id);
      setDetail(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar la conversación",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  /** Silent refresh — does NOT reset loading (ideal for polling). */
  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getInboxConversationDetail(id);
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
