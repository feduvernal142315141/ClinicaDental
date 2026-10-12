"use client";

import * as React from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
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
import { useAssistantText } from "@/lib/contexts/assistant-name-context";
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
  assistantName: string,
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
  return { label: assistantName, className: "text-emerald-600 dark:text-emerald-400" };
}

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxConversationRowProps {
  conversation: InboxConversation;
  isSelected: boolean;
  onClick: (id: string) => void;
  /** Modo selección: la fila marca/desmarca en vez de abrir el chat. */
  selectionMode?: boolean;
  checked?: boolean;
  /** Se alcanzó el máximo: las filas sin marcar no se pueden añadir. */
  selectionDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  /** Con él, la fila ofrece su menú con «Eliminar conversación». */
  onDelete?: (conversation: InboxConversation) => void;
  className?: string;
}

export function InboxConversationRow({
  conversation,
  isSelected,
  onClick,
  selectionMode = false,
  checked = false,
  selectionDisabled = false,
  onToggleSelect,
  onDelete,
  className,
}: InboxConversationRowProps) {
  const { language, t } = useI18n();
  const { assistantName } = useAssistantText();
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
  const statusCfg = getStatusConfig(status, handlingMode, t, assistantName);
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

  const cannotAdd = selectionMode && selectionDisabled && !checked;
  const toggle = () => {
    if (!cannotAdd) onToggleSelect?.(id);
  };

  return (
    <div
      className={cn(
        "group relative flex w-full items-center transition-colors",
        "hover:bg-hover",
        (selectionMode ? checked : isSelected)
          ? "bg-brand/[0.06] dark:bg-brand/10"
          : hasUnread
            ? "bg-brand/[0.03] dark:bg-brand/[0.06]"
            : "bg-transparent",
        className,
      )}
    >
      {selectionMode && (
        <Checkbox
          checked={checked}
          disabled={cannotAdd}
          onCheckedChange={toggle}
          aria-label={t("inbox.select.rowAria").replace("{name}", displayName)}
          className="ml-4"
        />
      )}
      <button
        type="button"
        onClick={selectionMode ? toggle : () => onClick(id)}
        aria-label={ariaLabel.trim()}
        aria-selected={isSelected}
        aria-disabled={cannotAdd || undefined}
        // En modo selección la casilla es el control; la fila es un atajo de puntero.
        tabIndex={selectionMode ? -1 : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left",
          selectionMode && "pl-3",
          cannotAdd && "cursor-not-allowed opacity-60",
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
      {!selectionMode && onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("inbox.action.rowMenu").replace("{name}", displayName)}
              className={cn(
                "absolute right-2 top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full",
                "border border-hairline bg-surface text-subtle shadow-sm hover:text-ink md:flex",
                "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
              )}
            >
              <MoreVertical className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(conversation)}>
              <Trash2 className="size-4" />
              {t("inbox.action.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
