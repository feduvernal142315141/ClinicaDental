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
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function relativeTime(dateStr: string | null, language: string, t: (key: TranslationKey) => string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t("inbox.time.now");
  if (diffMin < 60) return t("inbox.time.minutesAgo").replace("{count}", String(diffMin));
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("inbox.time.hoursAgo").replace("{count}", String(diffH));
  const today = new Date();
  const thenDate = new Date(dateStr);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    thenDate.getDate() === yesterday.getDate() &&
    thenDate.getMonth() === yesterday.getMonth() &&
    thenDate.getFullYear() === yesterday.getFullYear()
  ) {
    return t("inbox.time.yesterday");
  }
  return thenDate.toLocaleDateString(language, {
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
  t: (key: TranslationKey) => string,
): { label: string; className: string } {
  if (status === "NEEDS_HUMAN") {
    return {
      label: t("inbox.status.needsHuman"),
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  if (status === "RESOLVED") {
    return { label: t("inbox.status.resolved"), className: "text-subtle/60" };
  }
  if (handlingMode === "HUMAN") {
    return { label: t("inbox.handling.human"), className: "text-brand" };
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
  const { language, t } = useI18n();
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

  const displayName = patientName || contactPhone || t("inbox.contact.unregistered");
  const initials = patientName
    ? getInitials(patientName)
    : contactPhone
      ? contactPhone.slice(-2)
      : "?";
  const statusCfg = getStatusConfig(status, handlingMode, t);
  const dotColor = getStatusDot(status, handlingMode);
  const hasUnread = unreadCount > 0;
  const ariaLabel = hasUnread
    ? t("inbox.row.aria")
        .replace("{name}", displayName)
        .replace(
          "{unread}",
          t("inbox.row.unreadAria").replace("{count}", String(unreadCount)),
        )
    : t("inbox.row.aria")
        .replace("{name}", displayName)
        .replace("{unread}", "");

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-label={ariaLabel.trim()}
      aria-selected={isSelected}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-hover",
        isSelected
          ? "bg-brand/[0.06] dark:bg-brand/10"
          : hasUnread
            ? "bg-brand/[0.03] dark:bg-brand/[0.06]"
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
                ? "bg-brand/20 text-brand dark:bg-brand/25"
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
              "truncate text-[13.5px]",
              hasUnread ? "font-bold text-ink" : "font-medium text-ink",
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px]",
              hasUnread ? "font-bold text-brand" : "text-subtle",
            )}
          >
            {relativeTime(lastMessageAt, language, t)}
          </span>
        </div>

        {/* Bottom row: preview + badge + status */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[12.5px]",
              hasUnread ? "font-medium text-ink/80" : "text-subtle",
            )}
          >
            {lastMessagePreview || "\u00A0"}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {!hasUnread && (
              <span className={cn("text-[10px] font-medium", statusCfg.className)}>
                {statusCfg.label}
              </span>
            )}
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
