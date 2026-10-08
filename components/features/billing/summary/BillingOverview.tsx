"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  CreditCard,
  FilePlus2,
  Landmark,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  Unlock,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import { Alert, AlertDescription, Input, Label } from "@/components/ui";
import { PAYMENT_METHOD_LABELS, type CashSummaryMethod } from "@/lib/entity/billing";
import {
  useBillingPermissions,
  useCashSummary,
  useChargeList,
  useCurrentCashSession,
} from "@/lib/hooks/billing";
import { useI18n } from "@/lib/contexts/i18n-context";
import { billingErrorMessage } from "@/lib/services/billing";
import { localTodayInput } from "@/lib/datetime";
import { Money } from "../shared/Money";
import { formatBillingTime } from "../shared/billing-format";
import { LinkButton } from "../shared/LinkButton";
import { CardsSkeleton } from "../shared/BillingSkeletons";

const METHOD_ICONS: Record<CashSummaryMethod, LucideIcon> = {
  CASH: Banknote,
  CARD_POS: CreditCard,
  TRANSFER: Landmark,
  OTHER: Wallet,
};

function StatCard({
  label,
  children,
  icon: Icon,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="bento flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-subtle">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <div className="text-2xl font-semibold text-ink">{children}</div>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/** A. Resumen de Finanzas: caja del día, estado de la caja y accesos rápidos. */
export function BillingOverview() {
  const permissions = useBillingPermissions();
  const { t } = useI18n();
  const [date, setDate] = useState(() => localTodayInput());

  const summary = useCashSummary(date, { enabled: permissions.canViewReports });
  const cash = useCurrentCashSession();
  const pendingCharges = useChargeList({ status: "PENDING", page: 0, pageSize: 1 });
  const pendingCount = pendingCharges.data?.pagination.total;

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={t("billing.overview.title")}
        description={t("billing.overview.description")}
        action={
          permissions.canCreate ? (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/billing/estimates/new" variant="outline">
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  {t("billing.actions.newEstimate")}
                </LinkButton>
              <LinkButton href="/billing/invoices/new">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  {t("billing.actions.newInvoice")}
                </LinkButton>
            </div>
          ) : undefined
        }
      />

      {/* Estado de caja */}
      <section aria-labelledby="cash-status" className="bento flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            {cash.data ? <Unlock className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
          </span>
          <div>
            <h2 id="cash-status" className="text-sm font-semibold text-ink">
              {cash.isPending
                ? t("billing.cash.checking")
                : cash.data
                  ? t("billing.cash.openSince").replace("{time}", formatBillingTime(cash.data.openedAt))
                  : t("billing.cash.closed")}
            </h2>
            {cash.data && (
              <p className="text-sm text-subtle">
                {t("billing.cash.expected")} <Money amount={cash.data.expectedCash} currency={cash.data.currency} className="font-medium text-ink" />
              </p>
            )}
            {cash.isError && <p className="text-sm text-rose-700 dark:text-rose-300">{billingErrorMessage(cash.error)}</p>}
          </div>
        </div>
        {!cash.isPending && !cash.data && permissions.canOpenCash ? (
          <LinkButton href="/billing/cash?open=1">{t("billing.cash.open")}</LinkButton>
        ) : (
          <LinkButton href="/billing/cash" variant="outline">
              {t("billing.cash.view")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </LinkButton>
        )}
      </section>

      {/* Accesos rápidos */}
      <section aria-label={t("billing.overview.quickAccess")} className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/billing/charges"
          className="bento flex items-center justify-between gap-3 p-4 transition-colors hover:bg-hover"
        >
          <span className="flex items-center gap-2 font-medium text-ink">
            <ClipboardList className="h-4 w-4 text-brand" />
            {t("billing.navigation.charges")}{pendingCount !== undefined ? ` (${pendingCount})` : ""}
          </span>
          <ArrowRight className="h-4 w-4 text-subtle" />
        </Link>
        <Link
          href="/billing/estimates"
          className="bento flex items-center justify-between gap-3 p-4 transition-colors hover:bg-hover"
        >
          <span className="flex items-center gap-2 font-medium text-ink">
            <FilePlus2 className="h-4 w-4 text-brand" />
            {t("billing.navigation.estimates")}
          </span>
          <ArrowRight className="h-4 w-4 text-subtle" />
        </Link>
        <Link
          href="/billing/invoices"
          className="bento flex items-center justify-between gap-3 p-4 transition-colors hover:bg-hover"
        >
          <span className="flex items-center gap-2 font-medium text-ink">
            <ReceiptText className="h-4 w-4 text-brand" />
            {t("billing.navigation.invoices")}
          </span>
          <ArrowRight className="h-4 w-4 text-subtle" />
        </Link>
      </section>

      {/* Caja del día (requiere billing_reports) */}
      {permissions.canViewReports && (
        <section aria-labelledby="day-summary" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="day-summary" className="text-base font-semibold text-ink">
              {t("billing.overview.dayCash")}
            </h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="summary-date" className="text-sm text-subtle">
                {t("billing.date")}
              </Label>
              <Input
                id="summary-date"
                type="date"
                value={date}
                max={localTodayInput()}
                onChange={(event) => event.target.value && setDate(event.target.value)}
                className="h-9 w-40"
              />
            </div>
          </div>

          {summary.isError && (
            <Alert variant="destructive">
              <AlertDescription>{billingErrorMessage(summary.error)}</AlertDescription>
            </Alert>
          )}

          {summary.isPending ? (
            <CardsSkeleton label={t("billing.loading.dayCash")} />
          ) : summary.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("billing.metric.collected")} icon={Banknote}>
                  <Money amount={summary.data.collectedTotal} currency={summary.data.currency} />
                </StatCard>
                <StatCard label={t("billing.metric.refunded")} icon={RotateCcw}>
                  <Money amount={summary.data.refundedTotal} currency={summary.data.currency} />
                </StatCard>
                <StatCard label={t("billing.metric.pending")} icon={ReceiptText} hint={t("billing.metric.pendingHint")}>
                  <Money amount={summary.data.pendingTotal} currency={summary.data.currency} />
                </StatCard>
                <StatCard label={t("billing.metric.patientsWithBalance")} icon={Users}>
                  <span className="tabular-nums">{summary.data.patientsWithBalance}</span>
                </StatCard>
              </div>
              <div className="bento grid gap-3 p-4 sm:grid-cols-4">
                {(Object.keys(METHOD_ICONS) as CashSummaryMethod[]).map((method) => {
                  const Icon = METHOD_ICONS[method];
                  return (
                    <div key={method} className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
                      <span className="flex items-center gap-2 text-sm text-subtle">
                        <Icon className="h-4 w-4" aria-hidden />
                        {PAYMENT_METHOD_LABELS[method]}
                      </span>
                      <Money
                        amount={summary.data.byMethod[method] ?? 0}
                        currency={summary.data.currency}
                        className="font-semibold text-ink"
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
