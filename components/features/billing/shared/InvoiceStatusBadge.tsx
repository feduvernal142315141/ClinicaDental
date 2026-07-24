import { cn } from "@/lib/utils/utils";
import {
  ESTIMATE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  type EstimateStatus,
  type InvoiceStatus,
} from "@/lib/entity/billing";

const INVOICE_BADGE: Record<InvoiceStatus, string> = {
  ISSUED: "bg-brand/10 text-brand ring-brand/20",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-700 ring-amber-400/25 dark:text-amber-300",
  PAID: "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25 dark:text-emerald-300",
  VOID: "bg-hover text-subtle ring-hairline",
};

const ESTIMATE_BADGE: Record<EstimateStatus, string> = {
  DRAFT: "bg-hover text-subtle ring-hairline",
  SENT: "bg-brand/10 text-brand ring-brand/20",
  ACCEPTED: "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25 dark:text-emerald-300",
  REJECTED: "bg-rose-500/15 text-rose-700 ring-rose-400/25 dark:text-rose-300",
  EXPIRED: "bg-hover text-subtle ring-hairline",
  CONVERTED: "bg-violet-500/15 text-violet-700 ring-violet-400/25 dark:text-violet-300",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        INVOICE_BADGE[status],
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        ESTIMATE_BADGE[status],
      )}
    >
      {ESTIMATE_STATUS_LABELS[status]}
    </span>
  );
}
