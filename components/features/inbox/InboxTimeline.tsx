"use client";

import * as React from "react";
import { ArrowDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { InboxMessageBubble } from "./InboxMessageBubble";
import type { InboxMessage } from "@/lib/entity/inbox";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDaySeparator(
  dateStr: string,
  language: string,
  t: (key: TranslationKey) => string,
): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return t("inbox.time.today");
  }
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return t("inbox.time.yesterday");
  }
  return d.toLocaleDateString(language, {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxTimelineProps {
  messages: InboxMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  onLoadOlder: () => void;
  onNewMessageVisible?: () => void;
  className?: string;
}

/**
 * Chat timeline — renders messages in EXACT chronological order (oldest → newest).
 *
 * Alignment is ONLY determined by senderType/direction — never by sorting:
 * - CONTACT (INBOUND) → left
 * - DALIA / STAFF (OUTBOUND) → right
 * - SYSTEM → centered
 *
 * Sequential grouping: consecutive messages from the same senderType within
 * the same day get tighter spacing and the sender label is hidden.
 */
export function InboxTimeline({
  messages,
  loading,
  loadingOlder,
  hasMore,
  onLoadOlder,
  onNewMessageVisible,
  className,
}: InboxTimelineProps) {
  const { language, t } = useI18n();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const [showNewButton, setShowNewButton] = React.useState(false);
  const prevCountRef = React.useRef(messages.length);
  const isNearBottomRef = React.useRef(true);
  const initialScrollDone = React.useRef(false);

  const checkNearBottom = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = React.useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, []);

  // Initial scroll to bottom
  React.useEffect(() => {
    if (!loading && messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [loading, messages.length, scrollToBottom]);

  // Reset flag when conversation changes (messages go to 0)
  React.useEffect(() => {
    if (messages.length === 0) initialScrollDone.current = false;
  }, [messages.length]);

  // New messages: auto-scroll if near bottom, show button otherwise
  React.useEffect(() => {
    const curr = messages.length;
    const prev = prevCountRef.current;
    if (curr > prev && prev > 0) {
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(true));
        onNewMessageVisible?.();
      } else {
        setShowNewButton(true);
      }
    }
    prevCountRef.current = curr;
  }, [messages.length, scrollToBottom, onNewMessageVisible]);

  const handleScroll = React.useCallback(() => {
    isNearBottomRef.current = checkNearBottom();
    if (isNearBottomRef.current && showNewButton) {
      setShowNewButton(false);
      onNewMessageVisible?.();
    }
  }, [checkNearBottom, showNewButton, onNewMessageVisible]);

  const handleNewMessagesClick = React.useCallback(() => {
    scrollToBottom(true);
    setShowNewButton(false);
    onNewMessageVisible?.();
  }, [scrollToBottom, onNewMessageVisible]);

  // Chat-area background — subtle warm tint, distinct from sidebar surface
  const chatBg = "bg-[#f0f2f5] dark:bg-[#0b141a]";

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", chatBg, className)}>
        <LoadingSpinner size="sm" message={t("inbox.loading.messages")} />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", chatBg, className)}>
        <EmptyState
          icon={MessageSquare}
          title={t("inbox.messages.emptyTitle")}
          description={t("inbox.messages.emptyDescription")}
        />
      </div>
    );
  }

  // ── Message list — single flat chronological render ──────────────────
  return (
    <div className={cn("relative flex-1 overflow-hidden", chatBg, className)}>
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label={t("inbox.messages.aria")}
      >
        {/* Load older button */}
        {hasMore && (
          <div className="flex justify-center py-3">
            {loadingOlder ? (
              <LoadingSpinner size="sm" message="" />
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onLoadOlder}>
                {t("inbox.action.loadOlderMessages")}
              </Button>
            )}
          </div>
        )}

        {/* Chronological message list */}
        <div className="flex flex-col px-4 pt-2 pb-3 sm:px-6">
          {messages.map((msg, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;

            // Day separator between different days
            const showDaySeparator = !prev || !isSameDay(prev.createdAt, msg.createdAt);

            // Sequential grouping: same sender + same day → tight spacing, no label
            const isConsecutive = !!prev && prev.senderType === msg.senderType && !showDaySeparator;
            const showSender = !isConsecutive;

            return (
              <React.Fragment key={msg.id}>
                {showDaySeparator && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-lg bg-white/80 px-3 py-1 text-[11px] font-medium text-subtle shadow-sm dark:bg-white/10">
                      {formatDaySeparator(msg.createdAt, language, t)}
                    </span>
                  </div>
                )}
                <InboxMessageBubble
                  message={msg}
                  showSender={showSender}
                  isConsecutive={isConsecutive}
                />
              </React.Fragment>
            );
          })}
        </div>

        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Floating "new messages" button */}
      {showNewButton && (
        <button
          type="button"
          onClick={handleNewMessagesClick}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-surface px-4 py-2 text-xs font-medium text-brand shadow-lg ring-1 ring-hairline transition-transform hover:scale-105 dark:bg-elevated"
        >
          <span className="flex items-center gap-1.5">
            {t("inbox.action.newMessages")}
            <ArrowDown className="size-3" />
          </span>
        </button>
      )}
    </div>
  );
}
