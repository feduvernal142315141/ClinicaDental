"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Ban,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { useInvoices } from "@/lib/hooks/billing/useInvoices";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { billingService } from "@/lib/services/billing";
import { formatMoney } from "@/lib/utils/billing-currency";
import { InvoiceStatusBadge } from "../shared/InvoiceStatusBadge";
import { PaymentMethodBadge } from "../shared/PaymentMethodBadge";
import { RegisterPaymentDialog } from "../form/RegisterPaymentDialog";
import type {
  InvoiceResponse,
  PaymentResponse,
} from "@/lib/entity/billing";
import dayjs from "dayjs";

interface InvoiceDetailProps {
  invoiceId: string;
  patientId?: string;
  patientName?: string;
}

export function InvoiceDetail({
  invoiceId,
  patientId,
  patientName,
}: InvoiceDetailProps) {
  const router = useRouter();
  const branding = useClinicBranding();
  const { can, isAdmin } = usePermission();
  const canCreate = isAdmin || can("billing", PermissionAction.CREATE);
  const canVoid = isAdmin || can("billing", PermissionAction.BLOCK);
  const { getInvoiceById, voidInvoice, loading } = useInvoices();

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    const data = await getInvoiceById(invoiceId);
    setInvoice(data);
    const payRes = await billingService.getPayments({
      patientId: data.patientId,
      page: 0,
      pageSize: 100,
    });
    setPayments(
      payRes.entities.filter(
        (p) => p.invoiceId === invoiceId && !p.voided,
      ),
    );
  }, [getInvoiceById, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const backPatientId = patientId ?? invoice?.patientId;

  const handlePrint = () => {
    window.print();
  };

  const handleVoid = async () => {
    if (!invoice) return;
    if (
      !window.confirm(
        "¿Anular esta factura? Solo es posible si no tiene pagos asociados.",
      )
    ) {
      return;
    }
    setVoiding(true);
    try {
      const voided = await voidInvoice(invoice.id);
      setInvoice(voided);
    } finally {
      setVoiding(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando factura…" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bento p-6 text-center text-sm text-subtle">
        Factura no encontrada.
      </div>
    );
  }

  const isOpen =
    invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID";
  const isVoid = invoice.status === "VOID";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            backPatientId
              ? router.push(`/patients/${backPatientId}?tab=cuenta`)
              : router.push("/billing")
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir recibo
          </Button>
          {canCreate && isOpen && (
            <Button type="button" onClick={() => setPaymentOpen(true)}>
              <Banknote className="h-4 w-4" />
              Registrar pago
            </Button>
          )}
          {canVoid && isOpen && invoice.paidAmount === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleVoid()}
              disabled={voiding}
              className="text-rose-600 hover:text-rose-700"
            >
              <Ban className="h-4 w-4" />
              {voiding ? "Anulando…" : "Anular"}
            </Button>
          )}
        </div>
      </div>

      <section className="bento space-y-5 p-5 lg:p-6 print:border-0 print:shadow-none">
        {/* Encabezado con branding de clínica */}
        <div className="flex flex-col gap-4 border-b border-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.name}
                className="h-12 w-12 rounded-lg object-contain"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand/10 text-sm font-bold text-brand">
                {branding.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-ink">{branding.name}</p>
              <p className="text-xs text-subtle">Comprobante interno</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-xs text-subtle">{invoice.code}</p>
            <h1 className="text-xl font-semibold text-ink">
              {invoice.status === "PAID" ? "Recibo" : "Factura"}
            </h1>
            <p className="text-sm text-subtle">
              Emitida{" "}
              {invoice.issuedAt
                ? dayjs(invoice.issuedAt).format("DD/MM/YYYY")
                : dayjs(invoice.createdAt).format("DD/MM/YYYY")}
              {invoice.dueDate
                ? ` · vence ${dayjs(invoice.dueDate).format("DD/MM/YYYY")}`
                : ""}
            </p>
            <div className="mt-2 inline-flex">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {(patientName || backPatientId) && (
          <div className="text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              Paciente
            </p>
            <p className="font-medium text-ink">
              {patientName || `ID ${backPatientId?.slice(0, 8)}…`}
            </p>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-subtle">
              <th className="py-2 pr-2 font-medium">Descripción</th>
              <th className="py-2 pr-2 font-medium">Diente</th>
              <th className="py-2 pr-2 text-right font-medium">Cant.</th>
              <th className="py-2 pr-2 text-right font-medium">Precio</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-hairline/70">
                <td className="py-2.5 pr-2 text-ink">{item.description}</td>
                <td className="py-2.5 pr-2 text-subtle">
                  {item.toothRef || "—"}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-ink">
                  {item.quantity}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-ink">
                  {formatMoney(item.unitPrice, invoice.currency)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-ink">
                  {formatMoney(item.total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-subtle">
            <span>Subtotal</span>
            <span className="tabular-nums text-ink">
              {formatMoney(invoice.subtotal, invoice.currency)}
            </span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-subtle">
              <span>Descuento</span>
              <span className="tabular-nums text-ink">
                −{formatMoney(invoice.discount, invoice.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney(invoice.total, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between text-subtle">
            <span>Pagado</span>
            <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatMoney(invoice.paidAmount, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>Saldo</span>
            <span
              className={`tabular-nums ${
                invoice.balance > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {formatMoney(invoice.balance, invoice.currency)}
            </span>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="border-t border-hairline pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink">
              Pagos aplicados
            </p>
            <ul className="space-y-2">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <PaymentMethodBadge method={p.method} />
                    <span className="text-subtle">
                      {dayjs(p.paidAt).format("DD/MM/YYYY")}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums text-ink">
                    {formatMoney(p.amount, p.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {invoice.notes && (
          <div className="rounded-bento border border-hairline bg-canvas/50 p-3 text-sm text-subtle">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink">
              Notas
            </p>
            {invoice.notes}
          </div>
        )}

        {isVoid && (
          <p className="text-sm font-medium text-rose-600">
            Esta factura está anulada.
          </p>
        )}

        <p className="pt-2 text-center text-[11px] text-subtle print:block">
          Documento interno de {branding.name}. No constituye factura fiscal.
        </p>
      </section>

      <RegisterPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        patientId={invoice.patientId}
        currency={invoice.currency}
        invoices={[invoice]}
        defaultInvoiceId={invoice.id}
        onSuccess={() => {
          void load();
        }}
      />
    </div>
  );
}
