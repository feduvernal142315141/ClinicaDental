"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxConversationDetail } from "@/lib/entity/inbox";
import { getInboxConversationDetail, getInboxConversationDetailSilent } from "@/lib/services/inbox/inbox.service";

interface UseInboxConversationResult {
  detail: InboxConversationDetail | null;
  loading: boolean;
  error: string | null;
  /**
   * Id de la conversación para la que el servidor respondió 404: ya no existe
   * (fue eliminada). Lleva el id para no confundirla con la siguiente que se abra.
   */
  missingId: string | null;
  refresh: () => void;
}

function isNotFound(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 404;
}

export function useInboxConversation(
  id: string | undefined,
): UseInboxConversationResult {
  const [detail, setDetail] = useState<InboxConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingId, setMissingId] = useState<string | null>(null);

  // Generation counter: protects refresh against out-of-order REST responses
  const refreshGenRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const gen = ++refreshGenRef.current;
    setLoading(true);
    setError(null);
    setMissingId(null);
    try {
      const result = await getInboxConversationDetail(id);
      if (gen !== refreshGenRef.current) return; // Stale
      setDetail(result);
    } catch (err: unknown) {
      if (gen !== refreshGenRef.current) return;
      if (isNotFound(err)) setMissingId(id);
      setError(
        err instanceof Error ? err.message : "Error al cargar la conversación",
      );
    } finally {
      if (gen === refreshGenRef.current) setLoading(false);
    }
  }, [id]);

  /** Silent refresh — protected by generation counter, no loading bar. */
  const refresh = useCallback(async () => {
    if (!id) return;
    const gen = ++refreshGenRef.current;
    try {
      const result = await getInboxConversationDetailSilent(id);
      if (gen !== refreshGenRef.current) return; // Stale
      setDetail(result);
    } catch (err: unknown) {
      // Silent — polling errors should not disrupt the UI. Un 404 no es un
      // error de red: la conversación fue eliminada y el host debe cerrarla.
      if (gen === refreshGenRef.current && isNotFound(err)) setMissingId(id);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { detail, loading, error, missingId, refresh };
}
