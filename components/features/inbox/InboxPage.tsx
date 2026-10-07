"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useIsMobile } from "@/components/ui/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import type {
  InboxFilterPreset,
  InboxMessage,
} from "@/lib/entity/inbox";
import { INBOX_FILTER_PRESETS } from "@/lib/entity/inbox";

import { InboxConversationList } from "./InboxConversationList";
import { InboxTimeline } from "./InboxTimeline";
import { InboxComposer } from "./InboxComposer";
import { InboxChatHeader } from "./InboxChatHeader";
import { InboxContactPanel } from "./InboxContactPanel";
import { InboxPatientSearch } from "./InboxPatientSearch";
import { InboxNeedsHumanBanner } from "./InboxNeedsHumanBanner";
import { InboxWindowClosedBanner } from "./InboxWindowClosedBanner";
import { useI18n } from "@/lib/contexts/i18n-context";

import {
  useInboxConversations,
  useInboxConversation,
  useInboxMessages,
  useInboxSummary,
  useTakeover,
  useRelease,
  useResolve,
  useReopen,
  useSendMessage,
  useMarkRead,
  useLinkPatient,
  useInboxRealtime,
} from "@/lib/hooks/inbox";

type MobileView = "list" | "chat";

export function InboxPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { can, isAdmin } = usePermission();
  const isMobile = useIsMobile();

  const currentUserId = user?.id ?? null;
  const canEdit = isAdmin || can("whatsapp_inbox", PermissionAction.EDIT);
  const canCreate = isAdmin || can("whatsapp_inbox", PermissionAction.CREATE);
  const canBlock = isAdmin || can("whatsapp_inbox", PermissionAction.BLOCK);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InboxFilterPreset>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // ── Data hooks ────────────────────────────────────────────────────────────
  const convList = useInboxConversations();
  const convDetail = useInboxConversation(selectedId ?? undefined);
  const msgs = useInboxMessages(selectedId ?? undefined);
  const summary = useInboxSummary();

  // Auto-select first conversation on initial load (desktop only)
  useEffect(() => {
    if (!isMobile && selectedId === null && convList.conversations.length > 0 && !convList.loading) {
      setSelectedId(convList.conversations[0].id);
    }
  }, [isMobile, selectedId, convList.conversations, convList.loading]);

  // ── Action hooks ──────────────────────────────────────────────────────────
  const afterMutation = useCallback(() => {
    convDetail.refresh();
    convList.refresh();
  }, [convDetail, convList]);

  const takeover = useTakeover(afterMutation);
  const releaseAction = useRelease(afterMutation);
  const resolveAction = useResolve(afterMutation);
  const reopenAction = useReopen(afterMutation);
  const sendMsg = useSendMessage(() => {
    msgs.refresh();
    convList.refresh();
  });
  const markRead = useMarkRead();
  const linkPatient = useLinkPatient(afterMutation);

  // ── Real-time: SSE (preferred) → adaptive polling (fallback) ────────────
  useInboxRealtime({
    conversationListRefresh: convList.refresh,
    activeConversationRefresh: selectedId ? convDetail.refresh : undefined,
    messagesRefresh: selectedId ? msgs.refresh : undefined,
    summaryRefresh: summary.refresh,
    activeConversationId: selectedId ?? undefined,
  });

  // ── Auto-mark read ────────────────────────────────────────────────────────
  const lastReadId = useRef<string | null>(null);
  useEffect(() => {
    if (
      selectedId &&
      convDetail.detail &&
      convDetail.detail.unreadCount > 0 &&
      canEdit &&
      lastReadId.current !== selectedId
    ) {
      lastReadId.current = selectedId;
      markRead.execute(selectedId);
    }
  }, [selectedId, convDetail.detail, canEdit, markRead]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      lastReadId.current = null;
      if (isMobile) setMobileView("chat");
    },
    [isMobile],
  );

  const handleBack = useCallback(() => setMobileView("list"), []);

  const handleFilterChange = useCallback(
    (preset: InboxFilterPreset) => {
      setActiveFilter(preset);
      setSelectedId(null);
      const def = INBOX_FILTER_PRESETS.find((p) => p.value === preset);
      convList.setQuery({ ...def?.params, pageSize: 20, search: searchTerm || undefined });
    },
    [convList, searchTerm],
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setSelectedId(null);
      const def = INBOX_FILTER_PRESETS.find((p) => p.value === activeFilter);
      convList.setQuery({ ...def?.params, search: term || undefined, pageSize: 20 });
    },
    [convList, activeFilter],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!selectedId) return;
      // Optimistic: show message immediately with PENDING status
      const tempMsg: InboxMessage = {
        id: `temp-${Date.now()}`,
        conversationId: selectedId,
        direction: "OUTBOUND",
        senderType: "STAFF",
        senderUserId: currentUserId,
        role: null,
        content: text,
        wamid: null,
        status: "PENDING",
        statusUpdatedAt: null,
        messageType: "text",
        createdAt: new Date().toISOString(),
      };
      msgs.addLocalMessage(tempMsg);
      await sendMsg.execute(selectedId, text);
    },
    [selectedId, currentUserId, sendMsg, msgs],
  );

  const handleTakeover = useCallback(() => {
    if (selectedId) takeover.execute(selectedId);
  }, [selectedId, takeover]);

  const handleRelease = useCallback(() => {
    if (selectedId) releaseAction.execute(selectedId);
  }, [selectedId, releaseAction]);

  const handleResolve = useCallback(() => {
    if (selectedId) resolveAction.execute(selectedId);
  }, [selectedId, resolveAction]);

  const handleReopen = useCallback(() => {
    if (selectedId) reopenAction.execute(selectedId);
  }, [selectedId, reopenAction]);

  const handleLoadMore = useCallback(() => {
    convList.loadNextPage();
  }, [convList]);

  // ── Composer state ────────────────────────────────────────────────────────
  const d = convDetail.detail;

  const composerEnabled =
    d !== null &&
    d.status === "OPEN" &&
    d.handlingMode === "HUMAN" &&
    d.assignedTo === currentUserId &&
    d.windowOpen &&
    canCreate;

  const composerDisabledReason = (() => {
    if (!d) return undefined;
    if (d.status === "RESOLVED") return t("inbox.composer.disabled.resolved");
    if (d.status === "NEEDS_HUMAN") return t("inbox.composer.disabled.takeover");
    if (d.handlingMode === "DALIA") return t("inbox.composer.disabled.takeover");
    if (d.handlingMode === "HUMAN" && d.assignedTo && d.assignedTo !== currentUserId)
      return t("inbox.composer.disabled.assignedOther");
    if (!d.windowOpen) return t("inbox.composer.disabled.windowClosed");
    if (!canCreate) return t("inbox.composer.disabled.noPermission");
    return undefined;
  })();

  const pagination = convList.pagination
    ? { page: convList.pagination.page, pageSize: convList.pagination.pageSize, total: convList.pagination.total }
    : undefined;

  // ── Shared panels ─────────────────────────────────────────────────────────

  const listPanel = (
    <InboxConversationList
      conversations={convList.conversations}
      loading={convList.loading}
      loadingMore={convList.loadingMore}
      selectedId={selectedId}
      onSelect={handleSelect}
      query={searchTerm}
      onQueryChange={handleSearchChange}
      activeFilter={activeFilter}
      onFilterChange={handleFilterChange}
      totalUnread={summary.summary?.totalUnread ?? 0}
      pagination={pagination}
      onLoadMore={handleLoadMore}
    />
  );

  const chatPanel = selectedId && d ? (
    <div className="flex flex-1 flex-col min-w-0">
      <InboxChatHeader
        detail={d}
        currentUserId={currentUserId}
        onTakeover={handleTakeover}
        onRelease={handleRelease}
        onResolve={handleResolve}
        onReopen={handleReopen}
        onBack={isMobile ? handleBack : undefined}
        onShowDetails={() => isMobile ? setShowContactPanel(true) : setShowContactPanel((v) => !v)}
        canEdit={canEdit}
        canCreate={canCreate}
        canBlock={canBlock}
      />
      {d.status === "NEEDS_HUMAN" && <InboxNeedsHumanBanner onTakeover={handleTakeover} />}
      {!d.windowOpen && d.status !== "RESOLVED" && <InboxWindowClosedBanner />}
      <InboxTimeline
        messages={msgs.messages}
        loading={msgs.loading}
        loadingOlder={msgs.loadingOlder}
        hasMore={msgs.hasMore}
        onLoadOlder={msgs.loadOlderMessages}
      />
      <InboxComposer
        onSend={handleSend}
        disabled={!composerEnabled}
        disabledReason={composerDisabledReason}
        sending={sendMsg.loading}
      />
    </div>
  ) : (
    <div className="flex flex-1 items-center justify-center bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="text-center space-y-3">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-7 text-brand">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-ink">{t("inbox.whatsappTitle")}</p>
          <p className="text-sm text-subtle">{t("inbox.selectConversation")}</p>
        </div>
      </div>
    </div>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex h-[calc(100vh-56px)] flex-col">
        {mobileView === "list" ? listPanel : chatPanel}
        <Sheet open={showContactPanel} onOpenChange={setShowContactPanel}>
          <SheetContent side="right" className="w-full sm:max-w-sm p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>{t("inbox.details")}</SheetTitle>
            </SheetHeader>
            <InboxContactPanel detail={d} onLinkPatient={() => setShowPatientSearch(true)} canEdit={canEdit} />
          </SheetContent>
        </Sheet>
        <InboxPatientSearch
          open={showPatientSearch}
          onSelect={async (patientId) => {
            if (!selectedId) return;
            await linkPatient.execute(selectedId, patientId);
            setShowPatientSearch(false);
          }}
          onClose={() => setShowPatientSearch(false)}
        />
      </div>
    );
  }

  // ── Desktop 3-column layout ───────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className="w-[340px] shrink-0 border-r border-hairline">{listPanel}</div>
      {chatPanel}
      {selectedId && d && showContactPanel && (
        <div className="w-[320px] shrink-0 border-l border-hairline overflow-y-auto">
          <InboxContactPanel detail={d} onLinkPatient={() => setShowPatientSearch(true)} canEdit={canEdit} />
        </div>
      )}

      <InboxPatientSearch
        open={showPatientSearch}
        onSelect={async (patientId) => {
          if (!selectedId) return;
          await linkPatient.execute(selectedId, patientId);
          setShowPatientSearch(false);
        }}
        onClose={() => setShowPatientSearch(false)}
      />
    </div>
  );
}
