"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlarmClock, CalendarClock, Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/ui/atomic/data-display/status-badge";
import {
  LEAD_FOLLOW_UP_STATUS_LABELS,
  isFollowUpOverdue,
  isLeadOpen,
  type Lead,
  type LeadFollowUp,
} from "@/lib/entity/leads";
import {
  leadKeys,
  optionName,
  useCancelFollowUp,
  useCompleteFollowUp,
  useLeadUserOptions,
  type LeadPermissions,
} from "@/lib/hooks/leads";
import { hasLeadErrorCode } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";
import { cn } from "@/lib/utils/utils";
import { FollowUpDialog } from "../dialogs/FollowUpDialog";
import { formatLeadDateTime } from "../shared/lead-format";
import { notifyLeadError } from "../shared/lead-notify";

/** Pendientes primero (el más próximo arriba); después los cerrados, del más reciente al más antiguo. */
export function sortFollowUps(followUps: LeadFollowUp[]): LeadFollowUp[] {
  const time = (value: string) => new Date(value).getTime() || 0;
  return [...followUps].sort((a, b) => {
    const aPending = a.status === "PENDING";
    const bPending = b.status === "PENDING";
    if (aPending !== bPending) return aPending ? -1 : 1;
    return aPending ? time(a.dueAt) - time(b.dueAt) : time(b.dueAt) - time(a.dueAt);
  });
}

interface LeadFollowUpsProps {
  lead: Lead;
  followUps: LeadFollowUp[];
  permissions: LeadPermissions;
}

export function LeadFollowUps({ lead, followUps, permissions }: LeadFollowUpsProps) {
  const queryClient = useQueryClient();
  const users = useLeadUserOptions();
  const complete = useCompleteFollowUp();
  const cancel = useCancelFollowUp();
  const [scheduling, setScheduling] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const sorted = useMemo(() => sortFollowUps(followUps), [followUps]);
  const open = isLeadOpen(lead);

  const close = async (followUp: LeadFollowUp, action: "complete" | "cancel") => {
    setPending(followUp.id);
    try {
      const mutation = action === "complete" ? complete : cancel;
      await mutation.mutateAsync({ id: lead.id, followUpId: followUp.id });
      notify.success(action === "complete" ? "Seguimiento hecho" : "Seguimiento cancelado");
    } catch (error) {
      // Otra persona ya lo cerró o lo quitó: se recarga la lista.
      if (hasLeadErrorCode(error, "LEAD_FOLLOW_UP_NOT_FOUND") || hasLeadErrorCode(error, "LEAD_FOLLOW_UP_CLOSED")) {
        void queryClient.invalidateQueries({ queryKey: leadKeys.detail(lead.id) });
      }
      notifyLeadError(error, "No se pudo actualizar el seguimiento");
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="bento space-y-3 p-5" aria-labelledby="lead-follow-ups-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="lead-follow-ups-title" className="text-base font-semibold text-ink">
          Seguimientos
        </h2>
        {permissions.canCreate && open && (
          <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>
            <CalendarClock className="h-4 w-4" />
            Programar
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-subtle">No hay seguimientos programados.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((followUp) => {
            const overdue = isFollowUpOverdue(followUp);
            const isPending = followUp.status === "PENDING";
            const busy = pending === followUp.id;
            return (
              <li
                key={followUp.id}
                className={cn(
                  "space-y-2 rounded-xl border p-3",
                  overdue ? "border-rose-400/40 bg-rose-500/5" : "border-hairline",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    {overdue && <AlarmClock className="h-4 w-4 text-rose-600 dark:text-rose-300" aria-hidden />}
                    {formatLeadDateTime(followUp.dueAt)}
                  </span>
                  <StatusBadge tone={overdue ? "danger" : followUp.status === "DONE" ? "success" : "neutral"}>
                    {overdue ? "Vencido" : LEAD_FOLLOW_UP_STATUS_LABELS[followUp.status] ?? followUp.status}
                  </StatusBadge>
                </div>
                {followUp.note && <p className="whitespace-pre-wrap break-words text-sm text-ink">{followUp.note}</p>}
                <p className="text-xs text-subtle">
                  {optionName(users.data, followUp.assignedToUserId) ?? "Sin asignar"}
                  {followUp.completedAt &&
                    ` · cerrado el ${formatLeadDateTime(followUp.completedAt)}${followUp.completedBy ? ` por ${followUp.completedBy}` : ""}`}
                </p>
                {isPending && permissions.canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void close(followUp, "complete")}>
                      <Check className="h-4 w-4" />
                      Marcar hecho
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void close(followUp, "cancel")}>
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <FollowUpDialog lead={lead} open={scheduling} onOpenChange={setScheduling} />
    </section>
  );
}
