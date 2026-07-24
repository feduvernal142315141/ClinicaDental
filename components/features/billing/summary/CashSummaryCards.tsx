"use client";

import { Banknote, CreditCard, Landmark, Wallet, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import {
  PAYMENT_METHOD_LABELS,
  type CashSummaryResponse,
  type PaymentMethod,
} from "@/lib/entity/billing";
import { formatMoney } from "@/lib/utils/billing-currency";

interface CashSummaryCardsProps {
  summary: CashSummaryResponse | null;
  loading?: boolean;
}

const METHOD_ICON: Partial<Record<PaymentMethod, typeof Banknote>> = {
  CASH: Banknote,
  CARD_POS: CreditCard,
  TRANSFER: Landmark,
  ADVANCE: Wallet,
};

export function CashSummaryCards({ summary, loading }: CashSummaryCardsProps) {
  if (loading && !summary) {
    return (
      <div className="flex h-40 items-center justify-center">
        <LoadingSpinner size="md" message="Cargando caja…" />
      </div>
    );
  }

  if (!summary) return null;

  const methods = Object.entries(summary.byMethod) as [
    PaymentMethod,
    number,
  ][];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Cobrado hoy"
        value={formatMoney(summary.collectedTotal, summary.currency)}
        icon={Banknote}
        tone="positive"
      />
      <SummaryCard
        label="Por cobrar"
        value={formatMoney(summary.pendingTotal, summary.currency)}
        icon={Wallet}
        tone={summary.pendingTotal > 0 ? "warning" : "neutral"}
      />
      <SummaryCard
        label="Pacientes con saldo"
        value={String(summary.patientsWithBalance)}
        icon={Users}
      />
      <div className="rounded-bento border border-hairline bg-canvas/60 p-3.5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
          Por método
        </p>
        {methods.length === 0 ? (
          <p className="text-sm text-subtle">Sin cobros hoy</p>
        ) : (
          <ul className="space-y-1.5">
            {methods.map(([method, amount]) => {
              const Icon = METHOD_ICON[method] ?? Banknote;
              return (
                <li
                  key={method}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="inline-flex items-center gap-1.5 text-subtle">
                    <Icon className="h-3.5 w-3.5" />
                    {PAYMENT_METHOD_LABELS[method]}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">
                    {formatMoney(amount, summary.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: "neutral" | "positive" | "warning";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-ink";

  return (
    <div className="rounded-bento border border-hairline bg-canvas/60 p-3.5">
      <div className="mb-2 flex items-center gap-2 text-subtle">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
