"use client";

import * as React from "react";
import { Clock, Check, CheckCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { InboxMessage, MessageDeliveryStatus } from "@/lib/entity/inbox";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function DeliveryIcon({ status }: { status: MessageDeliveryStatus }) {
  const base = "size-3.5 shrink-0";
  switch (status) {
    case "PENDING":
      return <Clock className={cn(base, "text-subtle/60")} />;
    case "SENT":
      return <Check className={cn(base, "text-subtle/60")} />;
    case "DELIVERED":
      return <CheckCheck className={cn(base, "text-subtle/60")} />;
    case "READ":
      return <CheckCheck className={cn(base, "text-sky-500")} />;
    case "FAILED":
      return <AlertCircle className={cn(base, "text-rose-500")} />;
    default:
      return null;
  }
}

function getSenderLabel(senderType: InboxMessage["senderType"]): string {
  switch (senderType) {
    case "DALIA":
      return "Dalia";
    case "STAFF":
      return "Tú";
    default:
      return "";
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxMessageBubbleProps {
  message: InboxMessage;
  showSender: boolean;
  isConsecutive: boolean;
  className?: string;
}

/**
 * Chat bubble — aligned by senderType/direction:
 * - CONTACT (INBOUND)      → left,  neutral bg
 * - DALIA   (OUTBOUND)     → right, tinted bg
 * - STAFF   (OUTBOUND)     → right, brand-tinted bg
 * - SYSTEM                 → centered, no bubble
 *
 * WhatsApp-style tail on first message of a group.
 */
export function InboxMessageBubble({
  message,
  showSender,
  isConsecutive,
  className,
}: InboxMessageBubbleProps) {
  const { senderType, direction, content, createdAt, status } = message;

  // ── SYSTEM messages — event-style, no bubble ───────────────────────
  if (senderType === "SYSTEM") {
    return (
      <div
        className={cn(
          "flex justify-center",
          isConsecutive ? "mt-1" : "mt-4",
          className,
        )}
      >
        <span className="rounded-lg bg-hover/80 px-3 py-1 text-[11px] text-subtle">
          {content}
        </span>
      </div>
    );
  }

  // ── Chat bubbles ───────────────────────────────────────────────────
  const isOutbound = direction === "OUTBOUND";
  const isDalia = senderType === "DALIA";
  const label = getSenderLabel(senderType);

  return (
    <div
      className={cn(
        "flex",
        isOutbound ? "justify-end" : "justify-start",
        isConsecutive ? "mt-[3px]" : "mt-3",
        className,
      )}
    >
      <div
        className={cn(
          "relative max-w-[70%] px-3 py-[7px]",
          "sm:max-w-[65%]",
          // Bubble shape: rounded with WhatsApp-style pointed corner on first message
          isConsecutive
            ? "rounded-xl"
            : isOutbound
              ? "rounded-xl rounded-tr-[4px]"
              : "rounded-xl rounded-tl-[4px]",
          // Colors by sender type
          isOutbound
            ? isDalia
              ? "bg-emerald-500/10 dark:bg-emerald-500/15"
              : "bg-brand/10 dark:bg-brand/15"
            : "bg-surface ring-1 ring-hairline",
        )}
      >
        {/* Sender label — only on first of group, only for outbound */}
        {showSender && isOutbound && label && (
          <p
            className={cn(
              "mb-0.5 text-[11px] font-semibold",
              isDalia ? "text-emerald-600 dark:text-emerald-400" : "text-brand",
            )}
          >
            {label}
          </p>
        )}

        {/* Message content */}
        <p className="whitespace-pre-wrap text-[13.5px] leading-[1.45] text-ink">
          {content}
        </p>

        {/* Timestamp + delivery status — inline at bottom-right */}
        <div className="mt-[2px] flex items-center justify-end gap-1 -mb-[2px]">
          <span className="text-[10px] leading-none text-subtle/70 select-none">
            {formatTime(createdAt)}
          </span>
          {isOutbound && <DeliveryIcon status={status} />}
        </div>
      </div>
    </div>
  );
}
