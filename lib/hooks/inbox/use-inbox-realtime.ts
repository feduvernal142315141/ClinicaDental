"use client";

import { useCallback, useEffect, useRef } from "react";
import { useInboxSSE, type InboxSSEEvent } from "./use-inbox-sse";
import { useInboxPolling } from "./use-inbox-polling";

// ── Constants ─────────────────────────────────────────────────────────────

/** Debounce window for coalescing multiple SSE events into fewer REST fetches. */
const COALESCE_MS = 100;

// ── Types ─────────────────────────────────────────────────────────────────

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

interface InvalidationFlags {
  messages: boolean;
  conversationList: boolean;
  conversationDetail: boolean;
  summary: boolean;
}

const EMPTY_FLAGS: InvalidationFlags = {
  messages: false,
  conversationList: false,
  conversationDetail: false,
  summary: false,
};

// ── Hook ──────────────────────────────────────────────────────────────────
//
// Orchestrates real-time updates:
//
// 1. SSE (preferred) — targeted invalidation via event coalescing
// 2. Polling (fallback) — enabled automatically when SSE is not CONNECTED
//
// Polling is ON during: disconnected, obtaining_ticket, connecting,
//   reconnecting, fallback_polling.
// Polling is OFF during: connected.
//
// SSE events are coalesced within a 100ms window to reduce REST fetches.
// On SSE connect, a full resync covers the gap between ticket creation
// and stream establishment.
// ──────────────────────────────────────────────────────────────────────────

export function useInboxRealtime({
  conversationListRefresh,
  activeConversationRefresh,
  messagesRefresh,
  summaryRefresh,
  activeConversationId,
}: UseInboxRealtimeOptions): void {
  // ── Refs for latest values (no stale closures) ─────────────────────
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

  // ── Coalescing queue ──────────────────────────────────────────────
  const pendingRef = useRef<InvalidationFlags>({ ...EMPTY_FLAGS });
  const coalescingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const p = pendingRef.current;
    const cb = cbRefs.current;
    if (p.messages) cb.messagesRefresh?.();
    if (p.conversationList) cb.conversationListRefresh();
    if (p.conversationDetail) cb.activeConversationRefresh?.();
    if (p.summary) cb.summaryRefresh();
    pendingRef.current = { ...EMPTY_FLAGS };
    coalescingTimerRef.current = null;
  }, []);

  const invalidate = useCallback(
    (flags: Partial<InvalidationFlags>) => {
      Object.assign(pendingRef.current, flags);
      if (coalescingTimerRef.current) clearTimeout(coalescingTimerRef.current);
      coalescingTimerRef.current = setTimeout(flush, COALESCE_MS);
    },
    [flush],
  );

  // Cleanup coalescing timer on unmount
  useEffect(() => () => {
    if (coalescingTimerRef.current) clearTimeout(coalescingTimerRef.current);
  }, []);

  // ── SSE event handler — targeted invalidation per event matrix ────
  //
  // message_new      ACTIVE: messages + conversationList
  //                INACTIVE: conversationList
  // message_status   ACTIVE: messages
  //                INACTIVE: (nothing)
  // conversation_update ACTIVE: conversationList + conversationDetail
  //                   INACTIVE: conversationList
  // summary_update:   summary
  //
  const handleSSEEvent = useCallback(
    (event: InboxSSEEvent) => {
      const isActive =
        !!event.conversationId &&
        event.conversationId === activeIdRef.current;

      switch (event.type) {
        case "message_new":
          invalidate({
            conversationList: true,
            ...(isActive ? { messages: true } : {}),
          });
          break;

        case "message_status":
          if (isActive) invalidate({ messages: true });
          break;

        case "conversation_update":
          invalidate({
            conversationList: true,
            ...(isActive ? { conversationDetail: true } : {}),
          });
          break;

        case "summary_update":
          invalidate({ summary: true });
          break;
      }
    },
    [invalidate],
  );

  // ── Resync on SSE connect (covers gap during ticket + handshake) ──
  const handleConnected = useCallback(() => {
    const cb = cbRefs.current;
    cb.conversationListRefresh();
    cb.summaryRefresh();
    if (activeIdRef.current) {
      cb.messagesRefresh?.();
      cb.activeConversationRefresh?.();
    }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────
  const sseState = useInboxSSE({
    onEvent: handleSSEEvent,
    onConnected: handleConnected,
    enabled: true,
  });

  // ── Polling fallback — enabled when SSE is NOT connected ──────────
  // This means polling runs during: disconnected, obtaining_ticket,
  // connecting, reconnecting, fallback_polling.
  // Ensures zero downtime during reconnection.
  useInboxPolling({
    conversationListRefresh,
    activeConversationRefresh,
    messagesRefresh,
    summaryRefresh,
    enabled: sseState !== "connected",
  });
}
