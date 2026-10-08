"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { StatusBadge } from "@/components/ui/atomic/data-display/status-badge";
import { BillingPager } from "@/components/features/billing/shared/BillingPager";
import { LinesSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import {
  SEGMENT_RECIPIENTS_HIDDEN_MESSAGE,
  audienceCountLabel,
  campaignDeliveryStatusLabel,
  type GrowthCampaignMessage,
} from "@/lib/entity/growth";
import { useGrowthCampaignMessages } from "@/lib/hooks/growth";
import { useLeadAccess } from "@/lib/hooks/leads";

const STATUS_TONE: Record<string, "neutral" | "progress" | "success" | "warning" | "danger"> = {
  PENDING: "neutral",
  PROCESSING: "progress",
  SENT: "progress",
  DELIVERED: "success",
  READ: "success",
  FAILED: "danger",
  SKIPPED: "warning",
};

const DATE_TIME = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Latest thing that happened to the message, for the row's secondary line. */
function lastEvent(message: GrowthCampaignMessage): string | null {
  const events: [string, string | null | undefined][] = [
    ["Respondió", message.repliedAt],
    ["Leído", message.readAt],
    ["Entregado", message.deliveredAt],
    ["Enviado", message.sentAt],
  ];
  const found = events.find(([, at]) => !!at);
  if (!found) return null;
  const date = new Date(found[1] as string);
  return Number.isNaN(date.getTime()) ? found[0] : `${found[0]} · ${DATE_TIME.format(date)}`;
}

/**
 * Recipients of a campaign to prospects: who received it, who did not and why. The list was
 * frozen when the campaign was scheduled and the backend checked each prospect again right
 * before sending; whoever no longer qualified is "Omitido" with the backend's reason.
 */
export function GrowthCampaignRecipients({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(0);
  const { data, loading, error } = useGrowthCampaignMessages(campaignId, page);
  const { visible: canOpenLeads } = useLeadAccess();

  const recipients = data?.entities ?? [];
  const total = data?.pagination?.total ?? 0;
  // The backend hides who they are (empty page, real total) without permission over prospects.
  const hidden = !!data && total > 0 && recipients.length === 0 && page === 0;

  return (
    <DataCard title="Destinatarios" description="Prospectos de la campaña y resultado de cada envío">
      <div className="py-2">
        {loading && !data ? (
          <LinesSkeleton lines={4} label="Cargando destinatarios…" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : hidden ? (
          <div className="space-y-2">
            <p className="text-sm text-ink">
              <strong className="tabular-nums">{audienceCountLabel("LEAD", total)}</strong> en esta campaña
            </p>
            <p className="rounded-lg bg-hover px-3 py-2 text-sm text-subtle">{SEGMENT_RECIPIENTS_HIDDEN_MESSAGE}</p>
          </div>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-subtle">
            Todavía no hay destinatarios. La lista se fija cuando la campaña se programa o se envía.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-hairline">
              {recipients.map((message) => {
                const event = lastEvent(message);
                const stopped = message.deliveryStatus === "SKIPPED" || message.deliveryStatus === "FAILED";
                return (
                  <li key={message.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular-nums text-ink">
                        {message.leadId && canOpenLeads ? (
                          <Link href={`/leads/${message.leadId}`} className="underline-offset-2 hover:underline">
                            {message.phone}
                          </Link>
                        ) : (
                          message.phone
                        )}
                      </p>
                      {stopped && message.failureReason ? (
                        <p className="break-words text-xs text-subtle">{message.failureReason}</p>
                      ) : (
                        event && <p className="text-xs text-subtle">{event}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {message.leadId && canOpenLeads && (
                        <Link
                          href={`/leads/${message.leadId}`}
                          className="text-xs font-medium text-brand underline-offset-2 hover:underline"
                        >
                          Ver prospecto
                        </Link>
                      )}
                      <StatusBadge tone={STATUS_TONE[message.deliveryStatus] ?? "neutral"}>
                        {campaignDeliveryStatusLabel(message.deliveryStatus)}
                      </StatusBadge>
                    </div>
                  </li>
                );
              })}
            </ul>
            <BillingPager pagination={data?.pagination} onPageChange={setPage} noun="destinatarios" />
          </>
        )}
      </div>
    </DataCard>
  );
}
