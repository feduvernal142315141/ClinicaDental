"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Banknote, CircleDollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { DataTable } from "@/components/ui/data-display/data-table";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { usePatientLedger } from "@/lib/hooks/billing";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { formatMoney } from "@/lib/utils/billing-currency";
import { getInvoiceColumns } from "../table/invoices-table.config";
import { getPaymentColumns } from "../table/payments-table.config";
import { RegisterPaymentDialog } from "../form/RegisterPaymentDialog";
import { EstimateStatusBadge } from "../shared/InvoiceStatusBadge";
import dayjs from "dayjs";

interface PatientLedgerPanelProps {
  patientId: string;
  patientName?: string;
}

export function PatientLedgerPanel({
  patientId,
  patientName,
}: PatientLedgerPanelProps) {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const canCreate = isAdmin || can("billing", PermissionAction.CREATE);
  const { loading, ledger, fetchLedger } = usePatientLedger(patientId);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    void fetchLedger();
  }, [fetchLedger]);

  const invoiceColumns = useMemo(() => getInvoiceColumns(), []);
  const paymentColumns = useMemo(() => getPaymentColumns(), []);

  if (loading && !ledger) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando cuenta del paciente…" />
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="bento flex h-48 items-center justify-center p-6 text-sm text-subtle">
        No pudimos cargar la cuenta del paciente.
      </div>
    );
  }

  const currency = ledger.currency;

  return (
    <div className="space-y-4">
      <section className="bento space-y-4 p-4 lg:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Wallet className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold text-ink">
                Cuenta{patientName ? ` de ${patientName}` : ""}
              </h2>
            </div>
            <p className="text-sm text-subtle">
              Cargos, pagos y saldo. Los cobros se anotan aquí (efectivo, POS o
              transferencia); no se procesan en la app.
            </p>
          </div>
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/billing/estimates/new?patientId=${encodeURIComponent(patientId)}`,
                  )
                }
              >
                <FileText className="h-4 w-4" />
                Nuevo presupuesto
              </Button>
              <Button type="button" onClick={() => setPaymentOpen(true)}>
                <Banknote className="h-4 w-4" />
                Registrar pago
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Total cargado"
            value={formatMoney(ledger.totalCharged, currency)}
            icon={CircleDollarSign}
          />
          <KpiCard
            label="Pagado"
            value={formatMoney(ledger.totalPaid, currency)}
            tone="positive"
            icon={Banknote}
          />
          <KpiCard
            label="Saldo"
            value={formatMoney(ledger.balance, currency)}
            tone={ledger.balance > 0 ? "warning" : "positive"}
            hint={
              ledger.creditBalance > 0
                ? `Saldo a favor: ${formatMoney(ledger.creditBalance, currency)}`
                : undefined
            }
            icon={Wallet}
          />
        </div>
      </section>

      <section className="bento space-y-3 p-4 lg:p-5">
        <h3 className="text-sm font-semibold text-ink">Facturas</h3>
        {ledger.invoices.length === 0 ? (
          <EmptyHint text="Aún no hay facturas para este paciente." />
        ) : (
          <DataTable
            columns={invoiceColumns}
            data={ledger.invoices}
            loading={loading}
            rowKey="id"
            page={1}
            pageSize={Math.max(ledger.invoices.length, 5)}
            total={ledger.invoices.length}
            showSizeChanger={false}
          />
        )}
      </section>

      <section className="bento space-y-3 p-4 lg:p-5">
        <h3 className="text-sm font-semibold text-ink">Pagos</h3>
        {ledger.payments.length === 0 ? (
          <EmptyHint text="Todavía no hay pagos registrados." />
        ) : (
          <DataTable
            columns={paymentColumns}
            data={ledger.payments}
            loading={loading}
            rowKey="id"
            page={1}
            pageSize={Math.max(ledger.payments.length, 5)}
            total={ledger.payments.length}
            showSizeChanger={false}
          />
        )}
      </section>

      {ledger.estimates.length > 0 && (
        <section className="bento space-y-3 p-4 lg:p-5">
          <h3 className="text-sm font-semibold text-ink">Presupuestos</h3>
          <ul className="divide-y divide-hairline">
            {ledger.estimates.map((est) => (
              <li
                key={est.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/billing/estimates/${est.id}?patientId=${encodeURIComponent(patientId)}`,
                    )
                  }
                  className="text-left"
                >
                  <p className="font-mono text-xs text-subtle">{est.code}</p>
                  <p className="text-sm font-medium text-ink hover:underline">
                    {formatMoney(est.total, est.currency)}
                    {est.validUntil && (
                      <span className="ml-2 text-xs font-normal text-subtle">
                        válido hasta{" "}
                        {dayjs(est.validUntil).format("DD/MM/YYYY")}
                      </span>
                    )}
                  </p>
                </button>
                <EstimateStatusBadge status={est.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <RegisterPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        patientId={patientId}
        currency={currency}
        invoices={ledger.invoices}
        onSuccess={() => {
          void fetchLedger();
        }}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "warning";
  icon: typeof Wallet;
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
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-bento border border-dashed border-hairline bg-canvas/40 px-4 py-8 text-center text-sm text-subtle">
      {text}
    </p>
  );
}
