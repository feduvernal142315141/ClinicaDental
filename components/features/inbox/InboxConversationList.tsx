"use client";

import * as React from "react";
import { Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Input } from "@/components/ui/atomic/forms/input";
import { ScrollArea } from "@/components/ui/primitives/shadcn/scroll-area";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { InboxConversationRow } from "./InboxConversationRow";
import type { InboxConversation, InboxFilterPreset } from "@/lib/entity/inbox";
import { INBOX_DELETE_MAX, INBOX_FILTER_PRESETS } from "@/lib/entity/inbox";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useAssistantText } from "@/lib/contexts/assistant-name-context";
import type { TranslationKey } from "@/lib/i18n/translations";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InboxConversationListProps {
  conversations: InboxConversation[];
  loading: boolean;
  loadingMore?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  activeFilter: InboxFilterPreset;
  onFilterChange: (filter: InboxFilterPreset) => void;
  totalUnread?: number;
  pagination?: { page: number; pageSize: number; total: number };
  onLoadMore?: () => void;
  /**
   * Eliminar conversaciones. Solo se pasa a quien tiene permiso: sin él no hay
   * botón «Seleccionar» ni menú por fila.
   */
  deletion?: {
    selecting: boolean;
    selectedIds: ReadonlySet<string>;
    onStartSelecting: () => void;
    onCancelSelecting: () => void;
    onToggle: (id: string) => void;
    onDeleteSelected: () => void;
    onDeleteOne: (conversation: InboxConversation) => void;
  };
  className?: string;
}

// ── Empty-state copy per filter ────────────────────────────────────────────

const EMPTY_TITLE_KEYS: Record<InboxFilterPreset, TranslationKey> = {
  all: "inbox.empty.allTitle",
  unread: "inbox.empty.unreadTitle",
  needs_human: "inbox.empty.needsHumanTitle",
  dalia: "inbox.empty.daliaTitle",
  human: "inbox.empty.humanTitle",
  assigned_to_me: "inbox.empty.assignedTitle",
  resolved: "inbox.empty.resolvedTitle",
};

const EMPTY_DESCRIPTION_KEYS: Record<InboxFilterPreset, TranslationKey> = {
  all: "inbox.empty.allDescription",
  unread: "inbox.empty.unreadDescription",
  needs_human: "inbox.empty.needsHumanDescription",
  dalia: "inbox.empty.daliaDescription",
  human: "inbox.empty.humanDescription",
  assigned_to_me: "inbox.empty.assignedDescription",
  resolved: "inbox.empty.resolvedDescription",
};

const FILTER_LABEL_KEYS: Record<InboxFilterPreset, TranslationKey> = {
  all: "inbox.filter.all",
  unread: "inbox.filter.unread",
  needs_human: "inbox.filter.needsHuman",
  dalia: "inbox.filter.dalia",
  human: "inbox.filter.human",
  assigned_to_me: "inbox.filter.assignedToMe",
  resolved: "inbox.filter.resolved",
};

// ── Component ──────────────────────────────────────────────────────────────

export function InboxConversationList({
  conversations,
  loading,
  loadingMore = false,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  activeFilter,
  onFilterChange,
  totalUnread = 0,
  pagination,
  onLoadMore,
  deletion,
  className,
}: InboxConversationListProps) {
  const { t } = useI18n();
  const { withAssistant } = useAssistantText();
  const [localSearch, setLocalSearch] = React.useState(query);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when query changes externally (e.g. filter reset)
  React.useEffect(() => {
    setLocalSearch(query);
  }, [query]);

  const handleSearch = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onQueryChange(value);
      }, 300);
    },
    [onQueryChange],
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasMore =
    pagination && (pagination.page + 1) * pagination.pageSize < pagination.total;

  const selecting = deletion?.selecting ?? false;
  const selectedCount = deletion?.selectedIds.size ?? 0;
  const limitReached = selectedCount >= INBOX_DELETE_MAX;

  return (
    <div className={cn("flex h-full flex-col bg-surface", className)}>
      {/* Header */}
      {deletion && selecting ? (
        <div
          role="toolbar"
          aria-label={t("inbox.select.toolbar")}
          className="border-b border-hairline px-4 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink" aria-live="polite">
              {t("inbox.select.count").replace("{count}", String(selectedCount))}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectedCount === 0}
                onClick={deletion.onDeleteSelected}
              >
                {t("inbox.select.delete")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={deletion.onCancelSelecting}>
                {t("inbox.select.cancel")}
              </Button>
            </div>
          </div>
          {limitReached && (
            <p role="status" className="mt-1.5 text-[11px] text-subtle">
              {t("inbox.select.limit").replace("{max}", String(INBOX_DELETE_MAX))}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{t("inbox.title")}</h2>
            {totalUnread > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          {deletion && conversations.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={deletion.onStartSelecting}>
              {t("inbox.select.start")}
            </Button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="border-b border-hairline px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={localSearch}
            onChange={handleSearch}
            placeholder={t("inbox.search.placeholder")}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-hairline px-4 py-2">
        {INBOX_FILTER_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onFilterChange(preset.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              activeFilter === preset.value
                ? "bg-brand text-white"
                : "bg-hover text-subtle hover:text-ink",
            )}
          >
            {withAssistant(t(FILTER_LABEL_KEYS[preset.value]))}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="sm" message={t("inbox.loading.conversations")} />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={withAssistant(t(EMPTY_TITLE_KEYS[activeFilter]))}
            description={withAssistant(t(EMPTY_DESCRIPTION_KEYS[activeFilter]))}
            className="py-16"
          />
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => (
              <InboxConversationRow
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onClick={onSelect}
                selectionMode={selecting}
                checked={deletion?.selectedIds.has(conv.id) ?? false}
                selectionDisabled={limitReached}
                onToggleSelect={deletion?.onToggle}
                onDelete={deletion?.onDeleteOne}
              />
            ))}

            {hasMore && onLoadMore && (
              <div className="px-4 py-3">
                {loadingMore ? (
                  <div className="flex justify-center">
                    <LoadingSpinner size="sm" message="" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    block
                    onClick={onLoadMore}
                  >
                    {t("inbox.action.loadMore")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
