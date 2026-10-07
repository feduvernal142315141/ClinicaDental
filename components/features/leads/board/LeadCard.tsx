"use client";

import Link from "next/link";
import { CalendarPlus, MoreVertical, UserRound, XCircle } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import {
  LEAD_OPEN_STAGES,
  LEAD_STAGE_LABELS,
  hasPendingPatientMatch,
  isLeadOpen,
  leadDisplayName,
  leadSourceLabel,
  type Lead,
  type LeadOpenStage,
} from "@/lib/entity/leads";
import type { LeadPermissions } from "@/lib/hooks/leads";
import { cn } from "@/lib/utils/utils";
import { LeadMatchFlag, LeadOverdueFlag, LeadStatusBadge, LeadTemperatureTag } from "../shared/LeadBadges";
import { formatLeadRelative } from "../shared/lead-format";

export interface LeadCardActions {
  onMove: (lead: Lead, stage: LeadOpenStage) => void;
  onBook: (lead: Lead) => void;
  onLose: (lead: Lead) => void;
}

interface LeadCardProps extends LeadCardActions {
  lead: Lead;
  assigneeName?: string;
  permissions: LeadPermissions;
  /** Una escritura sobre esta tarjeta está en curso. */
  busy?: boolean;
  className?: string;
}

/** Tarjeta del tablero. El menú "Mover a…" es la alternativa al arrastre (teclado y táctil). */
export function LeadCard({ lead, assigneeName, permissions, busy, onMove, onBook, onLose, className }: LeadCardProps) {
  const open = isLeadOpen(lead);
  const name = leadDisplayName(lead);
  const pendingMatch = hasPendingPatientMatch(lead);
  const canMove = open && permissions.canEdit;
  const canLose = open && permissions.canManage;
  const hasMenu = canMove || canLose;

  return (
    <article
      className={cn(
        "space-y-2 rounded-xl border border-hairline bg-surface p-3 shadow-sm transition-opacity",
        busy && "opacity-60",
        className,
      )}
      aria-label={`Prospecto ${name}`}
      aria-busy={busy || undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          className="min-w-0 break-words text-sm font-semibold text-ink hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {name}
        </Link>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 h-8 w-8 shrink-0"
                aria-label={`Acciones para ${name}`}
                disabled={busy}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMove && (
                <>
                  <DropdownMenuLabel>Mover a…</DropdownMenuLabel>
                  {LEAD_OPEN_STAGES.filter((stage) => stage !== lead.stage).map((stage) => (
                    <DropdownMenuItem key={stage} onSelect={() => onMove(lead, stage)}>
                      {LEAD_STAGE_LABELS[stage]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onBook(lead)}>
                    <CalendarPlus className="h-4 w-4" />
                    Reservar cita
                  </DropdownMenuItem>
                </>
              )}
              {canLose && (
                <DropdownMenuItem onSelect={() => onLose(lead)}>
                  <XCircle className="h-4 w-4" />
                  Cerrar prospecto
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {!open && <LeadStatusBadge lead={lead} />}
        <LeadTemperatureTag temperature={lead.temperature} />
        <span className="text-xs text-subtle">{leadSourceLabel(lead.source)}</span>
      </div>

      {lead.interestServiceName && <p className="truncate text-xs text-ink">{lead.interestServiceName}</p>}

      {(lead.overdueFollowUp || pendingMatch) && (
        <div className="flex flex-wrap gap-1.5">
          {lead.overdueFollowUp && <LeadOverdueFlag />}
          {pendingMatch && <LeadMatchFlag />}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-subtle">
        <span className="inline-flex min-w-0 items-center gap-1">
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{assigneeName ?? (lead.assignedToUserId ? "Asignado" : "Sin asignar")}</span>
        </span>
        <span className="shrink-0" title="Última actividad">
          {formatLeadRelative(lead.lastActivityAt)}
        </span>
      </div>
    </article>
  );
}
