"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InboxConversation,
  InboxConversationPage,
  InboxConversationQueryParams,
} from "@/lib/entity/inbox";
import { getInboxConversations } from "@/lib/services/inbox/inbox.service";

interface UseInboxConversationsResult {
  conversations: InboxConversation[];
  pagination: Omit<InboxConversationPage, "rows"> | null;
  loading: boolean;
  error: string | null;
  query: InboxConversationQueryParams;
  setQuery: (q: InboxConversationQueryParams) => void;
  refresh: () => void;
}

export function useInboxConversations(
  initialQuery?: InboxConversationQueryParams,
): UseInboxConversationsResult {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [pagination, setPagination] = useState<Omit<
    InboxConversationPage,
    "rows"
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<InboxConversationQueryParams>(
    initialQuery ?? { page: 0, pageSize: 20 },
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInboxConversations(query);
      setConversations(result.rows ?? []);
      setPagination({
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar conversaciones",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  /** Silent refresh — does NOT reset loading (ideal for polling). */
  const refresh = useCallback(async () => {
    try {
      const result = await getInboxConversations(query);
      setConversations(result.rows ?? []);
      setPagination({
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    } catch {
      // Silent — polling errors should not disrupt the UI
    }
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    conversations,
    pagination,
    loading,
    error,
    query,
    setQuery,
    refresh,
  };
}
