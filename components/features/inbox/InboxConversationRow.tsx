"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/atomic/data-display/avatar";
import type {
  InboxConversation,
  ConversationStatus,
  HandlingMode,
} from "@/lib/entity/inbox";

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const today = new Date();
  const thenDate = new Date(dateStr);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    thenDate.getDate() === yesterday.getDate() &&
    thenDate.getMonth() === yesterday.getMonth() &&
    thenDate.getFullYear() === yesterday.getFullYear()
  ) {
    return "Ayer";
  }
  return thenDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

/** Derives a combined "visual status" from status + handlingMode. */
function getStatusConfig(
  status: ConversationStatus,
  handlingMode: HandlingMode,
): { label: string; className: string } {
  if (status === "NEEDS_HUMAN") {
    return {
      label: "Requiere atención",
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  if (status === "RESOLVED") {
    return { label: "Resuelta", className: "text-subtle" };
  }
  if (handlingMode === "HUMAN") {
    return { label: "Humano", className: "text-brand" };
  }
  return { label: "Dalia", className: "text-subtle" };
}

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxConversationRowProps {
  conversation: InboxConversation;
  isSelected: boolean;
  onClick: (id: string) => void;
  className?: string;
}

export function InboxConversationRow({
  conversation,
  isSelected,
  onClick,
  className,
}: InboxConversationRowProps) {
  const {
    id,
    patientName,
    contactPhone,
    lastMessagePreview,
    lastMessageAt,
    unreadCount,
    status,
    handlingMode,
  } = conversation;

  const displayName = patientName || contactPhone || "Contacto no registrado";
  const initials = patientName
    ? getInitials(patientName)
    : contactPhone
      ? contactPhone.slice(-2)
      : "?";
  const statusCfg = getStatusConfig(status, handlingMode);

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "border-l-2 border-l-transparent",
        "hover:bg-hover",
        isSelected && "border-l-brand bg-brand/5",
        className,
      )}
    >
      {/* Avatar */}
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-brand/10 text-brand text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Top row: name + time */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium text-ink",
              unreadCount > 0 && "font-semibold",
            )}
          >
            {displayName}
          </span>
          <span className="shrink-0 text-[11px] text-subtle">
            {relativeTime(lastMessageAt)}
          </span>
        </div>

        {/* Bottom row: preview + badge + status */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-subtle">
            {lastMessagePreview || "\u00A0"}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn("text-[10px]", statusCfg.className)}>
              {statusCfg.label}
            </span>
            {unreadCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
