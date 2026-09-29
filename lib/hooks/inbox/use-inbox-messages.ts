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
 * Stable chronological sort: by createdAt ascending, then by id for tie-breaking.
 * This guarantees the message list is ALWAYS in correct chronological order
 * regardless of how pages are merged.
 */
function sortChronological(msgs: InboxMessage[]): InboxMessage[] {
  return [...msgs].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
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

  /** Initial load: fetch the latest page and sort chronologically. */
  const fetchData = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });
      // Backend returns newest-first — sort to chronological
      setMessages(sortChronological(result));
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
        // Merge older + existing, deduplicate by id, sort chronologically
        const merged = new Map<string, InboxMessage>();
        for (const m of result) merged.set(m.id, m);
        for (const m of prev) merged.set(m.id, m);
        return sortChronological(Array.from(merged.values()));
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
   * Silent refresh — fetch the latest page, merge with existing,
   * update delivery statuses, and ALWAYS sort chronologically.
   * This ensures new messages from ANY sender appear in the right position.
   */
  const refresh = useCallback(async () => {
    if (!conversationId) return;

    try {
      const result = await getInboxMessages(conversationId, { limit: PAGE_SIZE });

      setMessages((prev) => {
        if (prev.length === 0) {
          // First load via refresh (e.g. after conversation switch)
          return sortChronological(result);
        }

        // Merge: use Map to deduplicate and update existing messages
        const merged = new Map<string, InboxMessage>();
        for (const m of prev) merged.set(m.id, m);
        // Overwrite with fresh data (updates delivery statuses) + add new
        for (const m of result) merged.set(m.id, m);

        return sortChronological(Array.from(merged.values()));
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
