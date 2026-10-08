"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxRealtimeEventType, RealtimeConnectionState } from "@/lib/entity/inbox";
import { createInboxSseTicket } from "@/lib/services/inbox/inbox.service";

// ── Public types ──────────────────────────────────────────────────────────

export interface InboxSSEEvent {
  type: InboxRealtimeEventType;
  conversationId?: string;
  messageId?: string;
  status?: string;
  direction?: string;
}

export interface UseInboxSSEOptions {
  onEvent: (event: InboxSSEEvent) => void;
  /** Called once SSE stream is confirmed open — trigger REST resync here. */
  onConnected?: () => void;
  enabled?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;
const FALLBACK_RETRY_MS = 60_000;
const CONNECTION_TIMEOUT_MS = 10_000;

/** Exponential backoff with ±20% jitter to prevent thundering herd. */
function backoffWithJitter(attempt: number): number {
  const base = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

// ── Hook ──────────────────────────────────────────────────────────────────
//
// State machine:
//
//   DISCONNECTED
//       │ mount / enable / online / visible
//   OBTAINING_TICKET  ←── POST /events/ticket (JWT via Axios)
//       │ ticket OK
//   CONNECTING         ←── new EventSource(url?ticket=...)
//       │ onopen
//   CONNECTED          ←── polling OFF, SSE events active
//       │ onerror / stream closed
//   RECONNECTING       ←── backoff timer → OBTAINING_TICKET
//       │ max retries exceeded
//   FALLBACK_POLLING   ←── polling ON, retry SSE every 60s
//
// Ticket is single-use, TTL 60s, memory-only — never persisted or logged.
// ──────────────────────────────────────────────────────────────────────────

export function useInboxSSE({
  onEvent,
  onConnected,
  enabled = true,
}: UseInboxSSEOptions): RealtimeConnectionState {
  const [state, setState] = useState<RealtimeConnectionState>("disconnected");
  const stateRef = useRef<RealtimeConnectionState>("disconnected");

  const sourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permissionDeniedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Callback refs — always current, never stale
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  // Forward ref for connect — breaks circular dep with scheduleReconnect
  const connectRef = useRef<() => void>(() => {});

  const setS = useCallback((s: RealtimeConnectionState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  // ── Cleanup all resources ────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    if (sourceRef.current) { sourceRef.current.close(); sourceRef.current = null; }
  }, []);

  // ── Schedule reconnect with backoff ──────────────────────────────
  const scheduleReconnect = useCallback(() => {
    if (retriesRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setS("fallback_polling");
      // Background retry: attempt SSE reconnection every 60s
      fallbackTimerRef.current = setTimeout(() => {
        if (enabledRef.current) {
          retriesRef.current = 0;
          connectRef.current();
        }
      }, FALLBACK_RETRY_MS);
      if (process.env.NODE_ENV === "development") {
        console.debug("[inbox-sse] max retries, fallback_polling + retry in 60s");
      }
      return;
    }

    setS("reconnecting");
    const delay = backoffWithJitter(retriesRef.current);
    retriesRef.current += 1;
    if (process.env.NODE_ENV === "development") {
      console.debug(`[inbox-sse] reconnecting (${retriesRef.current}/${MAX_RECONNECT_ATTEMPTS}, ${delay}ms)`);
    }
    retryTimerRef.current = setTimeout(() => connectRef.current(), delay);
  }, [setS]);

  // ── Main connection flow ─────────────────────────────────────────
  const connect = useCallback(async () => {
    cleanup();

    if (permissionDeniedRef.current || !enabledRef.current) {
      setS("disconnected");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || typeof EventSource === "undefined") {
      setS("disconnected");
      return;
    }

    // ── Step 1: Obtain ticket via Axios (JWT injected by interceptor) ──
    setS("obtaining_ticket");

    let ticket: string;
    try {
      ticket = await createInboxSseTicket();
    } catch (err: unknown) {
      const httpStatus =
        (err as { status?: number })?.status ??
        (err as { response?: { status?: number } })?.response?.status;

      if (httpStatus === 403) {
        // Permission denied — stop retrying until re-mount
        permissionDeniedRef.current = true;
        setS("disconnected");
        if (process.env.NODE_ENV === "development") {
          console.debug("[inbox-sse] 403 permission denied");
        }
        return;
      }
      // 401 handled transparently by Axios interceptor (refresh → retry).
      // Other errors (500, network) → backoff retry.
      scheduleReconnect();
      return;
    }

    // Guard: may have been disabled/unmounted during async ticket fetch
    if (!enabledRef.current) { setS("disconnected"); return; }

    // Guard: never create EventSource with invalid ticket
    if (typeof ticket !== "string" || !ticket.trim()) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[inbox-sse] invalid ticket received, type:", typeof ticket);
      }
      scheduleReconnect();
      return;
    }

    // ── Step 2: Create EventSource with temporary ticket (NOT JWT) ──
    setS("connecting");

    if (process.env.NODE_ENV === "development") {
      console.debug("[inbox-sse] ticket acquired:", ticket.length > 0);
    }

    const sseUrl = new URL(`${apiUrl}/whatsapp/inbox/events`);
    sseUrl.searchParams.set("ticket", ticket);
    const source = new EventSource(sseUrl.toString());
    sourceRef.current = source;

    // Connection timeout: if no onopen within 10s, reconnect
    timeoutRef.current = setTimeout(() => {
      if (stateRef.current === "connecting") {
        if (process.env.NODE_ENV === "development") {
          console.debug("[inbox-sse] connection timeout (10s)");
        }
        source.close();
        sourceRef.current = null;
        scheduleReconnect();
      }
    }, CONNECTION_TIMEOUT_MS);

    // ── Step 3: onopen → CONNECTED ──
    source.onopen = () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      retriesRef.current = 0;
      setS("connected");
      onConnectedRef.current?.();
      if (process.env.NODE_ENV === "development") {
        console.debug("[inbox-sse] connected");
      }
    };

    // ── Step 4: Named event listeners ──
    const handleEvent = (type: InboxRealtimeEventType) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEventRef.current({ type, ...data });
      } catch {
        // Invalid JSON — fire event with type only, don't break stream
        onEventRef.current({ type });
        if (process.env.NODE_ENV === "development") {
          console.warn("[inbox-sse] invalid JSON in event:", type);
        }
      }
    };

    source.addEventListener("message_new", handleEvent("message_new"));
    source.addEventListener("message_status", handleEvent("message_status"));
    source.addEventListener("conversation_update", handleEvent("conversation_update"));
    source.addEventListener("summary_update", handleEvent("summary_update"));
    // Backend optional confirmation event
    source.addEventListener("connected", () => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[inbox-sse] backend confirmed connection");
      }
    });
    // heartbeat is SSE comment (: heartbeat) — no listener needed

    // ── Step 5: onerror → reconnect with new ticket ──
    source.onerror = () => {
      source.close();
      sourceRef.current = null;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      scheduleReconnect();
    };
  }, [cleanup, setS, scheduleReconnect]);

  // Keep forward ref current
  connectRef.current = connect;

  // ── Auto-start / disable ─────────────────────────────────────────
  useEffect(() => {
    if (enabled) {
      permissionDeniedRef.current = false;
      connect();
    } else {
      cleanup();
      setS("disconnected");
    }
    return cleanup;
  }, [enabled, connect, cleanup, setS]);

  // ── Visibility: hidden → close, visible → reconnect ──────────────
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (document.visibilityState === "hidden") {
        cleanup();
        setS("disconnected");
      } else {
        retriesRef.current = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [enabled, connect, cleanup, setS]);

  // ── Online / offline ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const onOffline = () => { cleanup(); setS("disconnected"); };
    const onOnline = () => { retriesRef.current = 0; connect(); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, connect, cleanup, setS]);

  return state;
}
