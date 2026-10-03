"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, Banknote, Pencil, Printer } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import { Alert, AlertDescription, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { PAYMENT_METHOD_LABELS } from "@/lib/entity/billing";
import {
  useBillingPermissions,
  useClinicReceiptHeader,
  useInvoice,
  usePatientLedger,
  useVoidInvoice,
} from "@/lib/hooks/billing";
import { billingErrorMessage, isConflictError } from "@/lib/services/billing";
import { notify } from "@/lib/utils/notify";
import { InvoiceStatusBadge, PaymentStateBadge } from "../shared/BillingBadges";
import { DocumentTotals } from "../shared/DocumentTotals";
import { LineItemsTable } from "../shared/LineItemsTable";
import { LinkButton } from "../shared/LinkButton";
import { Money } from "../shared/Money";
import { ReasonDialog } from "../shared/ReasonDialog";
import { formatBillingDate, formatBillingDateTime } from "../shared/billing-format";
import { RegisterPaymentDialog } from "../payments/RegisterPaymentDialog";

/** Solo el recibo se imprime: se oculta el resto de la aplicación. */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #receipt-print, #receipt-print * { visibility: visible !important; }
  #receipt-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 12mm; }
  @page { margin: 12mm 0; }
}
`;

/** D. Detalle e imprimible del recibo. */
export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const permissions = useBillingPermissions();
  const { data: invoice, isPending, isError, error } = useInvoice(invoiceId);
  const ledger = usePatientLedger(invoice?.patientId);
  const clinic = useClinicReceiptHeader();
  const voidInvoice = useVoidInvoice();
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);

  if (isPending) return <LoadingSpinner message="Cargando recibo..." />;
  if (isError || !invoice) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  const isVoid = invoice.status === "VOID";
  const payable = invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID";
  const appliedPayments = (ledger.data?.payments ?? []).filter((payment) => payment.invoiceId === invoice.id);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      <div className="print:hidden">
        <Header
          level={1}
          title={`Recibo ${invoice.code}`}
          description={invoice.patientName ?? undefined}
          action={<InvoiceStatusBadge status={invoice.status} />}
        />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {permissions.canCreate && payable && (
          <Button onClick={() => setPaying(true)}>
            <Banknote className="mr-2 h-4 w-4" />
            Registrar pago
          </Button>
        )}
        {permissions.canEdit && !isVoid && (
          <LinkButton href={`/billing/invoices/${invoice.id}/edit`} variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </LinkButton>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        {permissions.canVoid && !isVoid && (
          <Button variant="outline" onClick={() => setVoiding(true)} className="text-rose-700 dark:text-rose-300">
            <Ban className="mr-2 h-4 w-4" />
            Anular
          </Button>
        )}
        <LinkButton href={`/patients/${invoice.patientId}?tab=cuenta`} variant="ghost">
          Cuenta del paciente
        </LinkButton>
      </div>

      {isVoid && (
        <Alert variant="warning" className="print:hidden">
          <AlertDescription>
            Recibo anulado el {formatBillingDateTime(invoice.voidedAt)}. Motivo: {invoice.voidReason ?? "—"}
          </AlertDescription>
        </Alert>
      )}

      {/* Documento imprimible */}
      <article id="receipt-print" className="bento space-y-6 p-6 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-4">
          <div className="space-y-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {clinic.data?.logoUrl && <img src={clinic.data.logoUrl} alt="" className="mb-2 h-10 w-auto" />}
            <p className="text-lg font-semibold text-ink">{clinic.data?.name ?? "Clínica"}</p>
            {clinic.data?.address && <p className="text-sm text-subtle">{clinic.data.address}</p>}
            {clinic.data?.phone && <p className="text-sm text-subtle">Tel. {clinic.data.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-subtle">Recibo</p>
            <p className="text-xl font-semibold text-ink">{invoice.code}</p>
            <p className="text-sm text-subtle">Emitido: {formatBillingDate(invoice.issuedAt)}</p>
            {invoice.dueDate && <p className="text-sm text-subtle">Vence: {formatBillingDate(invoice.dueDate)}</p>}
            {isVoid && <p className="mt-1 text-sm font-semibold text-rose-700">ANULADO</p>}
          </div>
        </header>

        <div className="text-sm">
          <p className="text-subtle">Paciente</p>
          <p className="font-medium text-ink">{invoice.patientName ?? "—"}</p>
        </div>

        <LineItemsTable items={invoice.items} currency={invoice.currency} />

        <DocumentTotals
          subtotal={invoice.subtotal}
          discount={invoice.discount}
          total={invoice.total}
          currency={invoice.currency}
          paid={invoice.paidAmount}
          balance={invoice.balance}
        />

        {appliedPayments.length > 0 && (
          <section aria-labelledby="receipt-payments" className="space-y-2">
            <h2 id="receipt-payments" className="text-sm font-semibold text-ink">
              Pagos aplicados
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="print:hidden">Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Aplicado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appliedPayments.map((payment) => (
                  <TableRow key={payment.id} className={payment.voided ? "opacity-60" : undefined}>
                    <TableCell>{formatBillingDateTime(payment.paidAt)}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                    <TableCell>{payment.reference ?? "—"}</TableCell>
                    <TableCell className="print:hidden">
                      <PaymentStateBadge payment={payment} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={payment.amount} currency={payment.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.appliedAmount != null ? (
                        <Money amount={payment.appliedAmount} currency={invoice.currency} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        {invoice.notes && (
          <div className="text-sm">
            <p className="text-subtle">Notas</p>
            <p className="whitespace-pre-wrap text-ink">{invoice.notes}</p>
          </div>
        )}

        <footer className="border-t border-hairline pt-3 text-center text-xs font-semibold uppercase tracking-widest text-subtle">
          Documento no fiscal
        </footer>
      </article>

      <RegisterPaymentDialog
        open={paying}
        onOpenChange={setPaying}
        patientId={invoice.patientId}
        patientName={invoice.patientName}
        invoices={[invoice]}
        invoiceId={invoice.id}
        creditBalance={ledger.data?.creditBalance ?? 0}
      />

      <ReasonDialog
        open={voiding}
        onOpenChange={setVoiding}
        title={`¿Anular el recibo ${invoice.code}?`}
        description="El recibo deja de cobrarse. Sus cargos vuelven a pendientes y, si venía de un presupuesto, este vuelve a Aceptado."
        confirmLabel="Anular recibo"
        onConfirm={async (reason) => {
          await voidInvoice.mutateAsync({ id: invoice.id, reason });
          notify.success("Recibo anulado", { description: invoice.code });
        }}
        renderErrorAction={(err) =>
          isConflictError(err) && appliedPayments.length > 0 ? (
            <Link
              href={`/billing/payments?patientId=${invoice.patientId}`}
              className="font-medium underline underline-offset-2"
            >
              Ir a los pagos de este paciente
            </Link>
          ) : null
        }
      />
    </div>
  );
}
