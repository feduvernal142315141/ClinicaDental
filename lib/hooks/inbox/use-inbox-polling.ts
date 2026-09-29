"use client";

import { useCallback, useEffect, useRef } from "react";

// ── Adaptive intervals ────────────────────────────────────────────────────────
// Active: user recently interacted or sent a message
// Idle:   no interaction for IDLE_THRESHOLD_MS → slow down to save bandwidth

const ACTIVE_LIST_MS = 15_000;
const ACTIVE_MESSAGES_MS = 8_000;
const ACTIVE_SUMMARY_MS = 30_000;

const IDLE_LIST_MS = 45_000;
const IDLE_MESSAGES_MS = 30_000;
const IDLE_SUMMARY_MS = 60_000;

const IDLE_THRESHOLD_MS = 2 * 60_000; // 2 minutes without interaction → idle

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseInboxPollingOptions {
  conversationListRefresh: () => void;
  activeConversationRefresh?: () => void;
  messagesRefresh?: () => void;
  summaryRefresh: () => void;
  /** Set to false to pause polling (e.g. when SSE is connected). */
  enabled?: boolean;
}

export function useInboxPolling({
  conversationListRefresh,
  activeConversationRefresh,
  messagesRefresh,
  summaryRefresh,
  enabled = true,
}: UseInboxPollingOptions): void {
  const listTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const cbRefs = useRef({ conversationListRefresh, activeConversationRefresh, messagesRefresh, summaryRefresh });
  cbRefs.current = { conversationListRefresh, activeConversationRefresh, messagesRefresh, summaryRefresh };

  const isIdle = useCallback(() => Date.now() - lastActivityRef.current > IDLE_THRESHOLD_MS, []);

  const clearTimers = useCallback(() => {
    if (listTimer.current) { clearInterval(listTimer.current); listTimer.current = null; }
    if (messagesTimer.current) { clearInterval(messagesTimer.current); messagesTimer.current = null; }
    if (summaryTimer.current) { clearInterval(summaryTimer.current); summaryTimer.current = null; }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    const idle = isIdle();
    const listMs = idle ? IDLE_LIST_MS : ACTIVE_LIST_MS;
    const msgMs = idle ? IDLE_MESSAGES_MS : ACTIVE_MESSAGES_MS;
    const sumMs = idle ? IDLE_SUMMARY_MS : ACTIVE_SUMMARY_MS;

    listTimer.current = setInterval(() => {
      cbRefs.current.conversationListRefresh();
      cbRefs.current.activeConversationRefresh?.();
    }, listMs);
    messagesTimer.current = setInterval(() => {
      cbRefs.current.messagesRefresh?.();
    }, msgMs);
    summaryTimer.current = setInterval(() => {
      cbRefs.current.summaryRefresh();
    }, sumMs);
  }, [clearTimers, isIdle]);

  // Track user activity → restart timers with active intervals
  useEffect(() => {
    if (!enabled) return;

    const markActive = () => {
      const wasIdle = isIdle();
      lastActivityRef.current = Date.now();
      if (wasIdle) startTimers(); // Switch from idle to active intervals
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => document.addEventListener(e, markActive, { passive: true }));
    return () => {
      events.forEach((e) => document.removeEventListener(e, markActive));
    };
  }, [enabled, isIdle, startTimers]);

  // Periodically check idle state and adjust intervals
  useEffect(() => {
    if (!enabled) return;

    const idleCheck = setInterval(() => {
      if (isIdle()) startTimers(); // Switch to idle intervals
    }, IDLE_THRESHOLD_MS);

    return () => clearInterval(idleCheck);
  }, [enabled, isIdle, startTimers]);

  // Auto-start / pause based on enabled
  useEffect(() => {
    if (enabled) {
      startTimers();
    } else {
      clearTimers();
    }
    return clearTimers;
  }, [enabled, startTimers, clearTimers]);

  // Pause when tab is hidden, resume when visible
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTimers();
      } else {
        lastActivityRef.current = Date.now();
        startTimers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, clearTimers, startTimers]);
}
