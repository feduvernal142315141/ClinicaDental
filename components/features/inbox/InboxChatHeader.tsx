"use client";

import * as React from "react";
import {
  ArrowLeft,
  MoreVertical,
  Hand,
  RotateCcw,
  CheckCircle2,
  Bot,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { StatusBadge } from "@/components/ui/atomic/data-display/status-badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import type { InboxConversationDetail } from "@/lib/entity/inbox";
import {
  CONVERSATION_STATUS_LABELS,
  HANDLING_MODE_LABELS,
} from "@/lib/entity/inbox";

// ── Helpers ────────────────────────────────────────────────────────────────

function getStatusTone(
  status: InboxConversationDetail["status"],
): "warning" | "success" | "neutral" {
  switch (status) {
    case "NEEDS_HUMAN":
      return "warning";
    case "RESOLVED":
      return "success";
    default:
      return "neutral";
  }
}

function getHandlingTone(
  mode: InboxConversationDetail["handlingMode"],
): "info" | "neutral" {
  return mode === "HUMAN" ? "info" : "neutral";
}

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxChatHeaderProps {
  detail: InboxConversationDetail | null;
  currentUserId: string | null;
  onTakeover: () => void;
  onRelease: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onBack?: () => void;
  onShowDetails?: () => void;
  canEdit?: boolean;
  canCreate?: boolean;
  canBlock?: boolean;
  className?: string;
}

export function InboxChatHeader({
  detail,
  currentUserId,
  onTakeover,
  onRelease,
  onResolve,
  onReopen,
  onBack,
  onShowDetails,
  className,
}: InboxChatHeaderProps) {
  if (!detail) return null;

  const {
    patientName,
    contactPhone,
    status,
    handlingMode,
    assignedTo,
  } = detail;

  const displayName = patientName || contactPhone || "Contacto no registrado";
  const isMine = !!currentUserId && assignedTo === currentUserId;
  const isHuman = handlingMode === "HUMAN";

  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-4",
        className,
      )}
    >
      {/* Mobile back */}
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      {/* Contact info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-ink">
          {displayName}
        </span>
        <div className="flex items-center gap-1.5">
          <StatusBadge
            tone={getStatusTone(status)}
            className="text-[10px] px-1.5 py-0"
          >
            {CONVERSATION_STATUS_LABELS[status]}
          </StatusBadge>
          <StatusBadge
            tone={getHandlingTone(handlingMode)}
            className="text-[10px] px-1.5 py-0"
          >
            {HANDLING_MODE_LABELS[handlingMode]}
          </StatusBadge>
        </div>
      </div>

      {/* Details toggle */}
      {onShowDetails && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onShowDetails}
          title="Detalles del contacto"
        >
          <PanelRight className="size-4" />
        </Button>
      )}

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-2">
        {/* NEEDS_HUMAN or DALIA: show "Tomar conversación" */}
        {(status === "NEEDS_HUMAN" || (!isHuman && status === "OPEN")) && (
          <Button type="button" size="sm" onClick={onTakeover}>
            <Hand className="size-4 mr-1" />
            Tomar conversación
          </Button>
        )}

        {/* HUMAN + mine: dropdown with release & resolve */}
        {isHuman && isMine && status === "OPEN" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRelease}>
                <Bot className="size-4" />
                Devolver a Dalia
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onResolve}>
                <CheckCircle2 className="size-4" />
                Resolver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* HUMAN + not mine */}
        {isHuman && !isMine && status === "OPEN" && (
          <span className="text-xs text-subtle">
            Atendida por otro miembro del equipo
          </span>
        )}

        {/* RESOLVED: reopen */}
        {status === "RESOLVED" && (
          <Button type="button" variant="outline" size="sm" onClick={onReopen}>
            <RotateCcw className="size-4 mr-1" />
            Reabrir
          </Button>
        )}
      </div>
    </div>
  );
}
