"use client";

import { useCallback, useEffect, useState } from "react";
import type { InboxMessage } from "@/lib/entity/inbox";
import { getInboxMessages } from "@/lib/services/inbox/inbox.service";

interface UseInboxMessagesResult {
  messages: InboxMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  loadOlderMessages: () => void;
  addLocalMessage: (msg: InboxMessage) => void;
  refresh: () => void;
}

const PAGE_SIZE = 30;

export function useInboxMessages(
  conversationId: string | undefined,
): UseInboxMessagesResult {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  /** Initial load: fetch the latest page and reverse to chronological order. */
  const fetchData = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });
      // Backend returns newest-first — reverse to chronological order
      const chronological = [...result].reverse();
      setMessages(chronological);
      setHasMore(result.length >= PAGE_SIZE);
    } catch {
      // Initial load errors are visible via the empty state
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Load older messages using keyset pagination.
   * Uses the oldest current message's createdAt / id as the cursor.
   */
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore || messages.length === 0)
      return;

    const oldest = messages[0];
    setLoadingOlder(true);
    try {
      const result = await getInboxMessages(conversationId, {
        before: oldest.createdAt,
        beforeId: oldest.id,
        limit: PAGE_SIZE,
      });
      // Backend returns newest-first — reverse to chronological
      const olderChronological = [...result].reverse();
      setMessages((prev) => [...olderChronological, ...prev]);
      setHasMore(result.length >= PAGE_SIZE);
    } catch {
      // Silent — user can retry
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, hasMore, messages]);

  /**
   * Optimistic send — append a local message to the end of the list
   * so the user sees it immediately before the server confirms.
   */
  const addLocalMessage = useCallback((msg: InboxMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Silent refresh — fetch the latest page and append any NEW messages
   * (those with an id not already in the list) without disrupting scroll.
   */
  const refresh = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;

    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });
      // Backend returns newest-first — reverse to chronological
      const chronological = [...result].reverse();

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = chronological.filter(
          (m) => !existingIds.has(m.id),
        );
        if (newMessages.length === 0) return prev;

        // Also update status of existing messages (delivery status changes)
        const updatedMap = new Map(chronological.map((m) => [m.id, m]));
        const updated = prev.map((m) => updatedMap.get(m.id) ?? m);

        return [...updated, ...newMessages];
      });
    } catch {
      // Silent — polling errors should not disrupt the UI
    }
  }, [conversationId, messages.length]);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    loadOlderMessages,
    addLocalMessage,
    refresh,
  };
}
