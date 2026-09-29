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

/** Status dot color for the avatar. */
function getStatusDot(
  status: ConversationStatus,
  handlingMode: HandlingMode,
): string | null {
  if (status === "NEEDS_HUMAN") return "bg-amber-500";
  if (status === "RESOLVED") return null; // no dot
  if (handlingMode === "HUMAN") return "bg-brand";
  return "bg-emerald-500"; // Dalia handling
}

/** Status label for the bottom row. */
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
    return { label: "Resuelta", className: "text-subtle/60" };
  }
  if (handlingMode === "HUMAN") {
    return { label: "Humano", className: "text-brand" };
  }
  return { label: "Dalia", className: "text-emerald-600 dark:text-emerald-400" };
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
  const dotColor = getStatusDot(status, handlingMode);
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-label={`Conversación con ${displayName}${hasUnread ? `, ${unreadCount} sin leer` : ""}`}
      aria-selected={isSelected}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-hover",
        isSelected
          ? "bg-brand/[0.06] dark:bg-brand/10"
          : "bg-transparent",
        className,
      )}
    >
      {/* Avatar with status dot */}
      <div className="relative shrink-0">
        <Avatar className="size-11">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              hasUnread
                ? "bg-brand/15 text-brand"
                : "bg-hover-strong text-subtle",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {dotColor && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-surface",
              dotColor,
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        {/* Top row: name + time */}
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[13.5px] text-ink",
              hasUnread ? "font-semibold" : "font-medium",
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px]",
              hasUnread ? "font-semibold text-brand" : "text-subtle",
            )}
          >
            {relativeTime(lastMessageAt)}
          </span>
        </div>

        {/* Bottom row: preview + badge + status */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[12.5px]",
              hasUnread ? "text-ink/70 font-medium" : "text-subtle",
            )}
          >
            {lastMessagePreview || "\u00A0"}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn("text-[10px] font-medium", statusCfg.className)}>
              {statusCfg.label}
            </span>
            {hasUnread && (
              <span className="flex min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
