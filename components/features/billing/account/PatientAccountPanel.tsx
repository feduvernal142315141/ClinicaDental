"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, ClipboardPlus, FilePlus2, ReceiptText, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { PAYMENT_METHOD_LABELS, type ChargeResponse } from "@/lib/entity/billing";
import { useBillingPermissions, useDismissCharge, usePatientLedger } from "@/lib/hooks/billing";
import { billingErrorMessage } from "@/lib/services/billing";
import { roundMoney } from "@/lib/utils/billing-currency";
import { notify } from "@/lib/utils/notify";
import { EstimateStatusBadge, InvoiceStatusBadge, PaymentStateBadge } from "../shared/BillingBadges";
import { Money } from "../shared/Money";
import { ReasonDialog } from "../shared/ReasonDialog";
import { formatBillingDate, formatBillingDateTime, formatDayMonth } from "../shared/billing-format";
import { LinkButton } from "../shared/LinkButton";
import { RegisterPaymentDialog } from "../payments/RegisterPaymentDialog";
import { ManualChargeDialog } from "../charges/ManualChargeDialog";
import { CardsSkeleton, TableSkeleton } from "../shared/BillingSkeletons";

interface PatientAccountPanelProps {
  patientId: string;
  patientName?: string | null;
}

function Section({ title, count, children, action }: { title: string; count?: number; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bento space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {title}
          {count !== undefined && <span className="ml-1.5 font-normal text-subtle">({count})</span>}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** B. Cuenta del paciente (pestaña "Cuenta" de la ficha). */
export function PatientAccountPanel({ patientId, patientName }: PatientAccountPanelProps) {
  const router = useRouter();
  const permissions = useBillingPermissions();
  const { data: ledger, isPending, isError, error } = usePatientLedger(patientId);
  const dismiss = useDismissCharge();
  const [selected, setSelected] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [charging, setCharging] = useState(false);
  const [dismissing, setDismissing] = useState<ChargeResponse | null>(null);

  if (isPending) {
    return (
      <div className="space-y-4">
        <CardsSkeleton label="Cargando la cuenta del paciente…" />
        <TableSkeleton columns={4} rows={3} label="Cargando la cuenta del paciente…" />
      </div>
    );
  }
  if (isError || !ledger) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  const nameParam = patientName ? `&patientName=${encodeURIComponent(patientName)}` : "";
  const pending = ledger.pendingCharges;
  const selectedCharges = pending.filter((charge) => selected.includes(charge.id));
  const selectedTotal = roundMoney(selectedCharges.reduce((sum, charge) => sum + charge.total, 0));

  const billSelected = () => {
    router.push(`/billing/invoices/new?patientId=${patientId}${nameParam}&chargeIds=${selected.join(",")}`);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado: totales en la moneda base */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bento p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">Total cargado</p>
          <Money amount={ledger.totalCharged} currency={ledger.currency} className="text-xl font-semibold text-ink" />
        </div>
        <div className="bento p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">Pagado</p>
          <Money amount={ledger.totalPaid} currency={ledger.currency} className="text-xl font-semibold text-ink" />
        </div>
        <div className="bento p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            {ledger.balance > 0 ? "Debe" : ledger.balance < 0 ? "A favor" : "Saldo"}
          </p>
          <Money amount={Math.abs(ledger.balance)} currency={ledger.currency} className={`text-xl font-semibold ${ledger.balance > 0 ? "text-rose-700 dark:text-rose-300" : ledger.balance < 0 ? "text-emerald-700 dark:text-emerald-300" : "text-ink"}`} />
        </div>
        <div className="bento p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">Saldo a favor</p>
          <Money amount={ledger.creditBalance} currency={ledger.currency} className="text-xl font-semibold text-ink" />
        </div>
      </div>

      {permissions.canCreate && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPaying(true)}>
            <Banknote className="mr-2 h-4 w-4" />
            Registrar pago
          </Button>
          <LinkButton href={`/billing/estimates/new?patientId=${patientId}${nameParam}`} variant="outline">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Nuevo presupuesto
          </LinkButton>
          <LinkButton href={`/billing/invoices/new?patientId=${patientId}${nameParam}`} variant="outline">
            <ReceiptText className="mr-2 h-4 w-4" />
            Nuevo recibo
          </LinkButton>
          <Button variant="outline" onClick={() => setCharging(true)}>
            <ClipboardPlus className="mr-2 h-4 w-4" />
            Cargo manual
          </Button>
        </div>
      )}

      {/* Cargos pendientes */}
      <Section
        title="Cargos pendientes"
        count={pending.length}
        action={
          permissions.canCreate && pending.length > 0 ? (
            <Button size="sm" onClick={billSelected} disabled={selected.length === 0}>
              Cobrar seleccionados
              {selected.length > 0 && (
                <span className="ml-1.5 tabular-nums">
                  (<Money amount={selectedTotal} currency={selectedCharges[0]?.currency ?? ledger.currency} />)
                </span>
              )}
            </Button>
          ) : undefined
        }
      >
        {pending.length === 0 ? (
          <p className="text-sm text-subtle">No hay cargos pendientes.</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-xl border border-hairline">
            {pending.map((charge) => (
              <li key={charge.id} className="flex items-center gap-3 px-4 py-3">
                {permissions.canCreate && (
                  <Checkbox
                    checked={selected.includes(charge.id)}
                    onCheckedChange={(value) =>
                      setSelected((current) =>
                        value === true ? [...current, charge.id] : current.filter((id) => id !== charge.id),
                      )
                    }
                    aria-label={`Seleccionar ${charge.description}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{charge.description}</p>
                  <p className="text-xs text-subtle">
                    {charge.sourceType === "APPOINTMENT" ? `Cita del ${formatDayMonth(charge.performedAt)}` : "Manual"}
                    {charge.toothRef ? ` · pieza ${charge.toothRef}` : ""}
                  </p>
                </div>
                <Money amount={charge.total} currency={charge.currency} className="text-sm font-medium" />
                {permissions.canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDismissing(charge)}
                    aria-label={`Descartar ${charge.description}`}
                    title="Descartar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Presupuestos */}
      <Section title="Presupuestos" count={ledger.estimates.length}>
        {ledger.estimates.length === 0 ? (
          <p className="text-sm text-subtle">Sin presupuestos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Válido hasta</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.estimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell>
                    <Link href={`/billing/estimates/${estimate.id}`} className="font-medium text-brand hover:underline">
                      {estimate.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <EstimateStatusBadge status={estimate.status} />
                  </TableCell>
                  <TableCell>{formatBillingDate(estimate.validUntil)}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={estimate.total} currency={estimate.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Recibos */}
      <Section title="Recibos" count={ledger.invoices.length}>
        {ledger.invoices.length === 0 ? (
          <p className="text-sm text-subtle">Sin recibos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Emitido</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link href={`/billing/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                      {invoice.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>{formatBillingDate(invoice.issuedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={invoice.total} currency={invoice.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={invoice.status === "VOID" ? 0 : invoice.balance} currency={invoice.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Pagos */}
      <Section title="Pagos" count={ledger.payments.length}>
        {ledger.payments.length === 0 ? (
          <p className="text-sm text-subtle">Sin pagos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Aplicado a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Devuelto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.payments.map((payment) => {
                const invoice = ledger.invoices.find((i) => i.id === payment.invoiceId);
                return (
                  <TableRow key={payment.id} className={payment.voided ? "opacity-60" : undefined}>
                    <TableCell>{formatBillingDateTime(payment.paidAt)}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                    <TableCell>{payment.reference ?? "—"}</TableCell>
                    <TableCell>{invoice ? invoice.code : "Anticipo"}</TableCell>
                    <TableCell>
                      <PaymentStateBadge payment={payment} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={payment.amount} currency={payment.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.refundedAmount > 0 ? <Money amount={payment.refundedAmount} currency={payment.currency} /> : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      <RegisterPaymentDialog
        open={paying}
        onOpenChange={setPaying}
        patientId={patientId}
        patientName={patientName}
        invoices={ledger.invoices}
        creditBalance={ledger.creditBalance}
      />
      <ManualChargeDialog open={charging} onOpenChange={setCharging} patientId={patientId} patientName={patientName} />
      <ReasonDialog
        open={dismissing !== null}
        onOpenChange={(open) => !open && setDismissing(null)}
        title="Descartar cargo"
        description={dismissing ? `«${dismissing.description}» dejará de estar pendiente de cobro.` : ""}
        confirmLabel="Descartar"
        onConfirm={async (reason) => {
          if (!dismissing) return;
          await dismiss.mutateAsync({ id: dismissing.id, reason });
          setSelected((current) => current.filter((id) => id !== dismissing.id));
          notify.success("Cargo descartado", { description: dismissing.description });
        }}
      />
    </div>
  );
}
