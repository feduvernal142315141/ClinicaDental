"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxMessage } from "@/lib/entity/inbox";
import { shouldAcceptDeliveryStatus } from "@/lib/entity/inbox";
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
 * We TRUST the backend's ordering — it uses DB insertion sequence which
 * reflects the real conversation flow (interleaved inbound/outbound).
 */
function toChronological(msgs: InboxMessage[]): InboxMessage[] {
  return [...msgs].reverse();
}

/**
 * Merge a fresh message into an existing one, preventing delivery status
 * regression. A stale REST response must not cause:
 *   READ → DELIVERED, DELIVERED → SENT, DELIVERED → FAILED, etc.
 */
function mergePreserveStatus(existing: InboxMessage, fresh: InboxMessage): InboxMessage {
  if (shouldAcceptDeliveryStatus(existing.status, fresh.status)) {
    return fresh; // Status transition valid → accept all fresh data
  }
  // Status transition invalid → keep existing status, update everything else
  return { ...fresh, status: existing.status, statusUpdatedAt: existing.statusUpdatedAt };
}

export function useInboxMessages(
  conversationId: string | undefined,
): UseInboxMessagesResult {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const convIdRef = useRef(conversationId);

  // Generation counter: protects against out-of-order REST responses
  const refreshGenRef = useRef(0);

  // Reset when conversation changes
  useEffect(() => {
    if (conversationId !== convIdRef.current) {
      convIdRef.current = conversationId;
      setMessages([]);
      setHasMore(true);
      refreshGenRef.current += 1; // Invalidate any in-flight refresh
    }
  }, [conversationId]);

  /** Initial load: fetch the latest page, reverse to chronological. */
  const fetchData = useCallback(async () => {
    if (!conversationId) return;
    const gen = ++refreshGenRef.current;
    setLoading(true);
    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });
      if (gen !== refreshGenRef.current) return; // Stale
      setMessages(toChronological(result));
      setHasMore(result.length >= PAGE_SIZE);
    } catch {
      // Initial load errors visible via empty state
    } finally {
      if (gen === refreshGenRef.current) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Load older messages using keyset pagination.
   * Independent from refresh — NOT invalidated by refreshGenRef.
   * Uses functional update + ID dedup for safe concurrent operation.
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
        return [...toChronological(olderMsgs), ...prev];
      });
      setHasMore(result.length >= PAGE_SIZE);
    } catch {
      // Silent — user can retry
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, hasMore, messages]);

  /** Optimistic send — append a local message to the end of the list. */
  const addLocalMessage = useCallback((msg: InboxMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Silent refresh — fetch the latest page, update delivery statuses for
   * existing messages, and append truly new messages at the end.
   *
   * Protected by generation counter: if another refresh started after this
   * one, this response is stale and gets discarded.
   *
   * Delivery status is monotonic: READ can't regress to DELIVERED.
   */
  const refresh = useCallback(async () => {
    if (!conversationId) return;
    const gen = ++refreshGenRef.current;

    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });

      // Stale response check
      if (gen !== refreshGenRef.current) return;

      setMessages((prev) => {
        if (prev.length === 0) {
          return toChronological(result);
        }

        // Build lookup of fresh data
        const freshMap = new Map<string, InboxMessage>();
        for (const m of result) freshMap.set(m.id, m);

        // Update existing messages with monotonic status protection
        const updated = prev.map((m) => {
          const fresh = freshMap.get(m.id);
          if (!fresh) return m;
          return mergePreserveStatus(m, fresh);
        });

        // Find truly new messages not in the current list
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = result.filter((m) => !existingIds.has(m.id));

        if (newMsgs.length === 0) return updated;

        // Remove optimistic temp messages, append real new ones
        const withoutTemp = updated.filter((m) => !m.id.startsWith("temp-"));
        return [...withoutTemp, ...toChronological(newMsgs)];
      });
    } catch {
      // Silent — polling/SSE errors should not disrupt the UI
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
