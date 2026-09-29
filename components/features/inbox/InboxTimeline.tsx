"use client";

import * as React from "react";
import { ArrowDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { ScrollArea } from "@/components/ui/primitives/shadcn/scroll-area";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { InboxMessageBubble } from "./InboxMessageBubble";
import type { InboxMessage } from "@/lib/entity/inbox";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDaySeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return "Hoy";
  }
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return "Ayer";
  }
  return d.toLocaleDateString("es-MX", {
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

export function InboxTimeline({
  messages,
  loading,
  loadingOlder,
  hasMore,
  onLoadOlder,
  onNewMessageVisible,
  className,
}: InboxTimelineProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const [showNewButton, setShowNewButton] = React.useState(false);
  const prevCountRef = React.useRef(messages.length);
  const isNearBottomRef = React.useRef(true);

  // Check if user is near the bottom (within 120px)
  const checkNearBottom = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Scroll to bottom
  const scrollToBottom = React.useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Auto-scroll on mount
  React.useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Handle new messages
  React.useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (isNearBottomRef.current) {
        scrollToBottom(true);
        onNewMessageVisible?.();
      } else {
        setShowNewButton(true);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length, scrollToBottom, onNewMessageVisible]);

  // Track scroll position
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

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <LoadingSpinner size="sm" message="Cargando mensajes..." />
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <EmptyState
          icon={MessageSquare}
          title="No hay mensajes"
          description="Los mensajes de esta conversación aparecerán aquí."
        />
      </div>
    );
  }

  return (
    <div className={cn("relative flex-1 overflow-hidden", className)}>
      <ScrollArea className="h-full">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
          onScroll={handleScroll}
        >
          {/* Load older */}
          {hasMore && (
            <div className="flex justify-center py-3">
              {loadingOlder ? (
                <LoadingSpinner size="sm" message="" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onLoadOlder}
                >
                  Cargar mensajes anteriores
                </Button>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-col pb-2">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const showDaySeparator =
                !prev || !isSameDay(prev.createdAt, msg.createdAt);
              const isConsecutive =
                !!prev &&
                prev.senderType === msg.senderType &&
                !showDaySeparator;
              const showSender = !isConsecutive;

              return (
                <React.Fragment key={msg.id}>
                  {showDaySeparator && (
                    <div className="my-4 flex items-center gap-3 px-4">
                      <div className="h-px flex-1 bg-hairline" />
                      <span className="text-[11px] font-medium text-subtle">
                        {formatDaySeparator(msg.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-hairline" />
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

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* New messages button */}
      {showNewButton && (
        <button
          type="button"
          onClick={handleNewMessagesClick}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white shadow-lg transition-transform hover:scale-105"
        >
          <span className="flex items-center gap-1.5">
            Nuevos mensajes
            <ArrowDown className="size-3" />
          </span>
        </button>
      )}
    </div>
  );
}
