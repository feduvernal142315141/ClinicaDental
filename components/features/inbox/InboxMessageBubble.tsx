"use client";

import * as React from "react";
import {
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { InboxMessage, MessageDeliveryStatus } from "@/lib/entity/inbox";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function DeliveryIcon({
  status,
}: {
  status: MessageDeliveryStatus;
}) {
  const base = "size-3 shrink-0";
  switch (status) {
    case "PENDING":
      return <Clock className={cn(base, "text-subtle")} />;
    case "SENT":
      return <Check className={cn(base, "text-subtle")} />;
    case "DELIVERED":
      return <CheckCheck className={cn(base, "text-subtle")} />;
    case "READ":
      return <CheckCheck className={cn(base, "text-brand")} />;
    case "FAILED":
      return <AlertCircle className={cn(base, "text-rose-500")} />;
    default:
      return null;
  }
}

function getSenderLabel(
  senderType: InboxMessage["senderType"],
): string {
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

export function InboxMessageBubble({
  message,
  showSender,
  isConsecutive,
  className,
}: InboxMessageBubbleProps) {
  const { senderType, direction, content, createdAt, status } = message;

  // ── SYSTEM messages ─────────────────────────────────────────────────
  if (senderType === "SYSTEM") {
    return (
      <div
        className={cn(
          "flex justify-center px-4",
          isConsecutive ? "mt-1" : "mt-3",
          className,
        )}
      >
        <span className="text-xs italic text-subtle">{content}</span>
      </div>
    );
  }

  // ── CONTACT = left, DALIA/STAFF = right ─────────────────────────────
  const isOutbound = direction === "OUTBOUND";

  return (
    <div
      className={cn(
        "flex px-4",
        isOutbound ? "justify-end" : "justify-start",
        isConsecutive ? "mt-0.5" : "mt-3",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[75%] md:max-w-[75%] rounded-2xl px-3 py-2",
          /* Mobile wider bubbles */
          "max-sm:max-w-[85%]",
          isOutbound
            ? "bg-brand/10 rounded-tr-sm"
            : "bg-hover rounded-tl-sm",
        )}
      >
        {/* Sender label */}
        {showSender && isOutbound && (
          <p className="mb-0.5 text-[11px] font-medium text-brand">
            {getSenderLabel(senderType)}
          </p>
        )}

        {/* Content */}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
          {content}
        </p>

        {/* Time + delivery status */}
        <div className="mt-1 flex items-center justify-end gap-1">
          <span className="text-[10px] text-subtle">{formatTime(createdAt)}</span>
          {isOutbound && <DeliveryIcon status={status} />}
        </div>
      </div>
    </div>
  );
}
