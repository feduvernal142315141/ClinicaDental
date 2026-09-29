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
  loadingMore: boolean;
  error: string | null;
  query: InboxConversationQueryParams;
  setQuery: (q: InboxConversationQueryParams) => void;
  loadNextPage: () => void;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryRaw] = useState<InboxConversationQueryParams>(
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

  /** setQuery always resets to page 0 (filter/search changes). */
  const setQuery = useCallback((q: InboxConversationQueryParams) => {
    setQueryRaw({ ...q, page: 0 });
  }, []);

  /** Load the next page and APPEND rows to the existing list. */
  const loadNextPage = useCallback(async () => {
    if (loadingMore || !pagination) return;
    const nextPage = (pagination.page ?? 0) + 1;
    if (nextPage * pagination.pageSize >= pagination.total) return;
    setLoadingMore(true);
    try {
      const result = await getInboxConversations({ ...query, page: nextPage });
      setConversations((prev) => [...prev, ...(result.rows ?? [])]);
      setPagination({
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    } catch {
      // Silent — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination, query]);

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
    loadingMore,
    error,
    query,
    setQuery,
    loadNextPage,
    refresh,
  };
}
