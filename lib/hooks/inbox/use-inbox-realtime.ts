"use client";

import { useCallback, useRef } from "react";
import { useInboxSSE, type InboxSSEEvent } from "./use-inbox-sse";
import { useInboxPolling } from "./use-inbox-polling";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseInboxRealtimeOptions {
  /** Refresh conversation list (silent). */
  conversationListRefresh: () => void;
  /** Refresh active conversation detail (silent). */
  activeConversationRefresh?: () => void;
  /** Refresh messages for the active conversation (silent). */
  messagesRefresh?: () => void;
  /** Refresh summary counts (sidebar badge). */
  summaryRefresh: () => void;
  /** The currently selected conversation id (to target refreshes). */
  activeConversationId?: string;
}

/**
 * Orchestrates real-time updates for the inbox:
 *
 * 1. Tries SSE connection to the backend.
 * 2. When SSE is connected → targeted refresh on each event, polling disabled.
 * 3. When SSE is disconnected (backend not ready or network issue) → adaptive polling fallback.
 *
 * This way the frontend is ready for SSE the moment the backend deploys
 * the `/whatsapp/inbox/events` endpoint, and degrades gracefully until then.
 */
export function useInboxRealtime({
  conversationListRefresh,
  activeConversationRefresh,
  messagesRefresh,
  summaryRefresh,
  activeConversationId,
}: UseInboxRealtimeOptions): void {
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  const cbRefs = useRef({
    conversationListRefresh,
    activeConversationRefresh,
    messagesRefresh,
    summaryRefresh,
  });
  cbRefs.current = {
    conversationListRefresh,
    activeConversationRefresh,
    messagesRefresh,
    summaryRefresh,
  };

  // ── SSE event handler — targeted refresh instead of full poll ────────────
  const handleSSEEvent = useCallback((event: InboxSSEEvent) => {
    if (event.type === "heartbeat") return;

    const cb = cbRefs.current;
    const isActiveConversation = event.conversationId === activeIdRef.current;

    switch (event.type) {
      case "message_new":
        // Always refresh conversation list (new message changes preview/order)
        cb.conversationListRefresh();
        cb.summaryRefresh();
        // Only refresh messages if the event is for the active conversation
        if (isActiveConversation) {
          cb.messagesRefresh?.();
        }
        break;

      case "message_status":
        // Delivery status update — only matters for the active conversation
        if (isActiveConversation) {
          cb.messagesRefresh?.();
        }
        break;

      case "conversation_update":
        // Status/assignment change — refresh list + detail if active
        cb.conversationListRefresh();
        cb.summaryRefresh();
        if (isActiveConversation) {
          cb.activeConversationRefresh?.();
        }
        break;
    }
  }, []);

  // ── SSE connection ──────────────────────────────────────────────────────
  const sseStatus = useInboxSSE({
    onEvent: handleSSEEvent,
    enabled: true,
  });

  const sseConnected = sseStatus === "connected";

  // ── Adaptive polling fallback — disabled when SSE is live ───────────────
  useInboxPolling({
    conversationListRefresh,
    activeConversationRefresh,
    messagesRefresh,
    summaryRefresh,
    enabled: !sseConnected,
  });
}
