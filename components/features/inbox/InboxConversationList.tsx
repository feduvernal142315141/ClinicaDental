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
import { INBOX_FILTER_PRESETS } from "@/lib/entity/inbox";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InboxConversationListProps {
  conversations: InboxConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  activeFilter: InboxFilterPreset;
  onFilterChange: (filter: InboxFilterPreset) => void;
  totalUnread?: number;
  pagination?: { page: number; pageSize: number; total: number };
  onLoadMore?: () => void;
  className?: string;
}

// ── Empty-state copy per filter ────────────────────────────────────────────

const EMPTY_TITLES: Partial<Record<InboxFilterPreset, string>> = {
  all: "Sin conversaciones",
  unread: "Todo al día",
  needs_human: "Sin pendientes",
  dalia: "Sin conversaciones de Dalia",
  human: "Sin conversaciones humanas",
  assigned_to_me: "Sin asignaciones",
  resolved: "Sin resueltas",
};

const EMPTY_DESCRIPTIONS: Partial<Record<InboxFilterPreset, string>> = {
  all: "Cuando los pacientes envíen mensajes aparecerán aquí.",
  unread: "No hay mensajes sin leer.",
  needs_human: "Dalia no ha transferido conversaciones.",
  dalia: "No hay conversaciones atendidas por Dalia.",
  human: "No hay conversaciones atendidas por humanos.",
  assigned_to_me: "No tienes conversaciones asignadas.",
  resolved: "No hay conversaciones resueltas.",
};

// ── Component ──────────────────────────────────────────────────────────────

export function InboxConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  activeFilter,
  onFilterChange,
  totalUnread = 0,
  pagination,
  onLoadMore,
  className,
}: InboxConversationListProps) {
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
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
    pagination && pagination.page * pagination.pageSize < pagination.total;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink">Bandeja</h2>
          {totalUnread > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-hairline px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            defaultValue={query}
            onChange={handleSearch}
            placeholder="Buscar conversación..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-hairline px-4 py-2 scrollbar-none">
        {INBOX_FILTER_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onFilterChange(preset.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeFilter === preset.value
                ? "bg-brand text-white"
                : "bg-hover text-subtle hover:text-ink",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="sm" message="Cargando conversaciones..." />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={EMPTY_TITLES[activeFilter] ?? "Sin conversaciones"}
            description={EMPTY_DESCRIPTIONS[activeFilter]}
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
              />
            ))}

            {hasMore && onLoadMore && (
              <div className="px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  block
                  onClick={onLoadMore}
                >
                  Cargar más
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
