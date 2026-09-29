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
      return <Clock className={cn(base, "text-subtle/50")} />;
    case "SENT":
      return <Check className={cn(base, "text-subtle/50")} />;
    case "DELIVERED":
      return <CheckCheck className={cn(base, "text-subtle/50")} />;
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
 * - CONTACT (INBOUND)      → left,  white surface
 * - DALIA   (OUTBOUND)     → right, soft green
 * - STAFF   (OUTBOUND)     → right, soft brand blue
 * - SYSTEM                 → centered pill, no bubble
 *
 * WhatsApp-style: pointed corner on first message of a group,
 * inline timestamp floated at bottom-right of the text flow.
 */
export function InboxMessageBubble({
  message,
  showSender,
  isConsecutive,
  className,
}: InboxMessageBubbleProps) {
  const { senderType, direction, content, createdAt, status } = message;

  // ── SYSTEM messages — event pill ───────────────────────────────────
  if (senderType === "SYSTEM") {
    return (
      <div
        className={cn(
          "flex justify-center",
          isConsecutive ? "mt-1.5" : "mt-4",
          className,
        )}
      >
        <span className="rounded-full bg-black/[0.06] px-3 py-1 text-[11px] text-subtle dark:bg-white/[0.08]">
          {content}
        </span>
      </div>
    );
  }

  // ── Chat bubbles ───────────────────────────────────────────────────
  const isOutbound = direction === "OUTBOUND";
  const isDalia = senderType === "DALIA";
  const label = getSenderLabel(senderType);

  // The invisible spacer reserves room for the timestamp so text wraps
  // around it naturally (WhatsApp-style inline timestamp).
  const timestampSpacer = (
    <span className="float-right ml-2 mt-1 h-0 w-[70px] select-none" aria-hidden="true">
      {"\u200B"}
    </span>
  );

  return (
    <div
      className={cn(
        "flex",
        isOutbound ? "justify-end" : "justify-start",
        isConsecutive ? "mt-[3px]" : "mt-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "relative max-w-[75%] px-[10px] py-[6px]",
          "sm:max-w-[65%]",
          // Bubble shape
          isConsecutive
            ? "rounded-lg"
            : isOutbound
              ? "rounded-lg rounded-tr-[3px]"
              : "rounded-lg rounded-tl-[3px]",
          // Background + shadow by sender type
          isOutbound
            ? isDalia
              ? "bg-emerald-50 shadow-sm dark:bg-emerald-950/40"
              : "bg-blue-50 shadow-sm dark:bg-blue-950/40"
            : "bg-surface shadow-sm dark:bg-elevated",
        )}
      >
        {/* Sender label — first of group, outbound only */}
        {showSender && isOutbound && label && (
          <p
            className={cn(
              "mb-0.5 text-[11px] font-semibold leading-tight",
              isDalia ? "text-emerald-600 dark:text-emerald-400" : "text-brand",
            )}
          >
            {label}
          </p>
        )}

        {/* Message text with timestamp spacer */}
        <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-ink">
          {content}
          {timestampSpacer}
        </p>

        {/* Timestamp + delivery — floated bottom-right, overlapping the spacer */}
        <span className="float-right -mt-4 flex items-center gap-[3px]">
          <span className="text-[10px] leading-none text-subtle/60 select-none">
            {formatTime(createdAt)}
          </span>
          {isOutbound && <DeliveryIcon status={status} />}
        </span>
      </div>
    </div>
  );
}
