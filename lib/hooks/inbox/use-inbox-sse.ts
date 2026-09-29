"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/auth/token-client";

// ── SSE event contract (backend must implement) ──────────────────────────────
//
// Endpoint: GET /whatsapp/inbox/events?token={jwt}
// Content-Type: text/event-stream
//
// Events:
//   event: message_new
//   data: {"conversationId":"..."}
//
//   event: message_status
//   data: {"conversationId":"...","messageId":"...","status":"DELIVERED"}
//
//   event: conversation_update
//   data: {"conversationId":"..."}
//
//   event: heartbeat
//   data: {}
// ─────────────────────────────────────────────────────────────────────────────

export type SSEConnectionStatus = "connecting" | "connected" | "disconnected";

export interface InboxSSEEvent {
  type: "message_new" | "message_status" | "conversation_update" | "heartbeat";
  conversationId?: string;
  messageId?: string;
  status?: string;
}

export interface UseInboxSSEOptions {
  onEvent: (event: InboxSSEEvent) => void;
  enabled?: boolean;
}

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export function useInboxSSE({
  onEvent,
  enabled = true,
}: UseInboxSSEOptions): SSEConnectionStatus {
  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const sourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setStatus("disconnected");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    const url = `${apiUrl}/whatsapp/inbox/events?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setStatus("connected");
      retriesRef.current = 0;
    };

    const handleEvent = (type: InboxSSEEvent["type"]) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEventRef.current({ type, ...data });
      } catch {
        onEventRef.current({ type });
      }
    };

    source.addEventListener("message_new", handleEvent("message_new"));
    source.addEventListener("message_status", handleEvent("message_status"));
    source.addEventListener("conversation_update", handleEvent("conversation_update"));
    source.addEventListener("heartbeat", handleEvent("heartbeat"));

    source.onerror = () => {
      source.close();
      sourceRef.current = null;
      setStatus("disconnected");

      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(
          BASE_DELAY_MS * Math.pow(2, retriesRef.current),
          MAX_DELAY_MS,
        );
        retriesRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      }
      // After MAX_RETRIES, stay disconnected — polling fallback takes over
    };
  }, [cleanup]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
      setStatus("disconnected");
    }
    return cleanup;
  }, [enabled, connect, cleanup]);

  // Pause when tab is hidden, reconnect when visible
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cleanup();
        setStatus("disconnected");
      } else {
        retriesRef.current = 0;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, connect, cleanup]);

  return status;
}
