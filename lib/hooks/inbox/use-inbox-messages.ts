"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const PAGE_SIZE = 50;

/**
 * Reverse the backend's newest-first array to oldest-first (chronological).
 *
 * We TRUST the backend's ordering — it uses the DB insertion sequence which
 * reflects the real conversation flow (interleaved inbound/outbound).
 * Sorting by `createdAt` would break the interleaving because WhatsApp
 * webhook timestamps and Dalia response timestamps can differ from the
 * logical conversation order.
 */
function toChronological(msgs: InboxMessage[]): InboxMessage[] {
  return [...msgs].reverse();
}

export function useInboxMessages(
  conversationId: string | undefined,
): UseInboxMessagesResult {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const convIdRef = useRef(conversationId);

  // Reset when conversation changes
  useEffect(() => {
    if (conversationId !== convIdRef.current) {
      convIdRef.current = conversationId;
      setMessages([]);
      setHasMore(true);
    }
  }, [conversationId]);

  /** Initial load: fetch the latest page, reverse to chronological. */
  const fetchData = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });
      // Backend returns newest-first — reverse to chronological
      setMessages(toChronological(result));
      setHasMore(result.length >= PAGE_SIZE);
    } catch {
      // Initial load errors visible via empty state
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
   * Prepends older messages at the start, preserving existing order.
   */
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore || messages.length === 0) return;

    const oldest = messages[0];
    setLoadingOlder(true);
    try {
      const result = await getInboxMessages(conversationId, {
        before: oldest.createdAt,
        beforeId: oldest.id,
        limit: PAGE_SIZE,
      });
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const olderMsgs = result.filter((m) => !existingIds.has(m.id));
        // Prepend older messages (reversed to chronological) before existing
        return [...toChronological(olderMsgs), ...prev];
      });
      setHasMore(result.length >= PAGE_SIZE);
    } catch {
      // Silent — user can retry
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, hasMore, messages]);

  /**
   * Optimistic send — append a local message to the end of the list.
   */
  const addLocalMessage = useCallback((msg: InboxMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Silent refresh — fetch the latest page, update delivery statuses for
   * existing messages, and append truly new messages at the end.
   *
   * Preserves the existing order (no re-sort) so interleaved conversations
   * stay interleaved. New messages are appended in the backend's sequence.
   */
  const refresh = useCallback(async () => {
    if (!conversationId) return;

    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });

      setMessages((prev) => {
        if (prev.length === 0) {
          return toChronological(result);
        }

        // Build a lookup of fresh data (for delivery status updates)
        const freshMap = new Map<string, InboxMessage>();
        for (const m of result) freshMap.set(m.id, m);

        // Update existing messages (delivery status, etc.) — preserve order
        const updated = prev.map((m) => freshMap.get(m.id) ?? m);

        // Find truly new messages not in the current list
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = result.filter((m) => !existingIds.has(m.id));

        if (newMsgs.length === 0) return updated;

        // Append new messages in backend sequence (reversed = chronological)
        // Remove optimistic temp messages that now have a real counterpart
        const withoutTemp = updated.filter((m) => !m.id.startsWith("temp-"));
        return [...withoutTemp, ...toChronological(newMsgs)];
      });
    } catch {
      // Silent — polling errors should not disrupt the UI
    }
  }, [conversationId]);

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
