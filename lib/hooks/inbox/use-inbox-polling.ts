"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseInboxPollingOptions {
  conversationListRefresh: () => void;
  activeConversationRefresh?: () => void;
  messagesRefresh?: () => void;
  summaryRefresh: () => void;
}

interface UseInboxPollingResult {
  start: () => void;
  stop: () => void;
}

const LIST_INTERVAL = 5_000;
const MESSAGES_INTERVAL = 3_000;
const SUMMARY_INTERVAL = 10_000;

export function useInboxPolling({
  conversationListRefresh,
  activeConversationRefresh,
  messagesRefresh,
  summaryRefresh,
}: UseInboxPollingOptions): UseInboxPollingResult {
  const listTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);

  const clearTimers = useCallback(() => {
    if (listTimer.current) {
      clearInterval(listTimer.current);
      listTimer.current = null;
    }
    if (messagesTimer.current) {
      clearInterval(messagesTimer.current);
      messagesTimer.current = null;
    }
    if (summaryTimer.current) {
      clearInterval(summaryTimer.current);
      summaryTimer.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    listTimer.current = setInterval(() => {
      conversationListRefresh();
      activeConversationRefresh?.();
    }, LIST_INTERVAL);
    messagesTimer.current = setInterval(() => {
      messagesRefresh?.();
    }, MESSAGES_INTERVAL);
    summaryTimer.current = setInterval(() => {
      summaryRefresh();
    }, SUMMARY_INTERVAL);
  }, [
    clearTimers,
    conversationListRefresh,
    activeConversationRefresh,
    messagesRefresh,
    summaryRefresh,
  ]);

  const start = useCallback(() => {
    running.current = true;
    startTimers();
  }, [startTimers]);

  const stop = useCallback(() => {
    running.current = false;
    clearTimers();
  }, [clearTimers]);

  // Pause when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTimers();
      } else if (running.current) {
        startTimers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearTimers, startTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return { start, stop };
}
