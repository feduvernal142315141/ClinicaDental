"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, Banknote, MoreHorizontal, Undo2 } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { PAYMENT_METHOD_LABELS, refundableAmount, type PaymentResponse } from "@/lib/entity/billing";
import { useBillingPermissions, usePaymentList, useRefundList, useVoidPayment } from "@/lib/hooks/billing";
import { useI18n } from "@/lib/contexts/i18n-context";
import { billingErrorMessage, isConflictError } from "@/lib/services/billing";
import { notify } from "@/lib/utils/notify";
import { PaymentStateBadge } from "../shared/BillingBadges";
import { BillingPager } from "../shared/BillingPager";
import { ListFilters, type PatientFilterValue } from "../shared/ListFilters";
import { Money } from "../shared/Money";
import { ReasonDialog } from "../shared/ReasonDialog";
import { formatBillingDateTime } from "../shared/billing-format";
import { RefundDialog } from "./RefundDialog";
import { TableSkeleton } from "../shared/BillingSkeletons";

const PAGE_SIZE = 20;

function canBeRefunded(payment: PaymentResponse) {
  return !payment.voided && payment.method !== "ADVANCE" && refundableAmount(payment) > 0;
}

/** F. Pagos y devoluciones. */
export function PaymentsPage({ initialPatient }: { initialPatient?: PatientFilterValue | null }) {
  const permissions = useBillingPermissions();
  const { t } = useI18n();
  const [tab, setTab] = useState("payments");
  const [patient, setPatient] = useState<PatientFilterValue | null>(initialPatient ?? null);
  const [range, setRange] = useState({ from: "", to: "" });
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [refundsPage, setRefundsPage] = useState(0);
  const [voiding, setVoiding] = useState<PaymentResponse | null>(null);
  const [refunding, setRefunding] = useState<PaymentResponse | null>(null);
  const voidPayment = useVoidPayment();

  const filters = { patientId: patient?.id, from: range.from || undefined, to: range.to || undefined };
  const payments = usePaymentList({ ...filters, page: paymentsPage, pageSize: PAGE_SIZE });
  const refunds = useRefundList({ ...filters, page: refundsPage, pageSize: PAGE_SIZE }, { enabled: tab === "refunds" });

  const onFilters = {
    patient: (value: PatientFilterValue | null) => {
      setPatient(value);
      setPaymentsPage(0);
      setRefundsPage(0);
    },
    range: (value: { from: string; to: string }) => {
      setRange(value);
      setPaymentsPage(0);
      setRefundsPage(0);
    },
  };

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={t("billing.payments.title")}
        description={t("billing.payments.description")}
      />

      <ListFilters
        patient={{ value: patient, onChange: onFilters.patient }}
        range={{ ...range, onChange: onFilters.range }}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="payments">{t("billing.payments.paymentsTab")}</TabsTrigger>
          <TabsTrigger value="refunds">{t("billing.payments.refundsTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          {payments.isError && (
            <Alert variant="destructive">
              <AlertDescription>{billingErrorMessage(payments.error)}</AlertDescription>
            </Alert>
          )}
          {payments.isPending ? (
            <TableSkeleton columns={8} label={t("billing.payments.loadingPayments")} />
          ) : payments.data && payments.data.entities.length === 0 ? (
            <EmptyState icon={Banknote} variant="card" title={t("billing.payments.emptyPayments")} description={t("billing.payments.emptyPaymentsDescription")} />
          ) : payments.data ? (
            <div className="bento overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.table.date")}</TableHead>
                    <TableHead>{t("billing.table.patient")}</TableHead>
                    <TableHead>{t("billing.table.appliedTo")}</TableHead>
                    <TableHead>{t("billing.table.method")}</TableHead>
                    <TableHead>{t("billing.table.reference")}</TableHead>
                    <TableHead>{t("billing.table.status")}</TableHead>
                    <TableHead className="text-right">{t("billing.table.amount")}</TableHead>
                    <TableHead className="text-right">{t("billing.table.refunded")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data.entities.map((payment) => {
                    const canVoid = permissions.canVoid && !payment.voided;
                    const canRefund = permissions.canRefund && canBeRefunded(payment);
                    return (
                      <TableRow key={payment.id} className={payment.voided ? "opacity-60" : undefined}>
                        <TableCell className="whitespace-nowrap">{formatBillingDateTime(payment.paidAt)}</TableCell>
                        <TableCell>
                          <Link href={`/patients/${payment.patientId}?tab=cuenta`} className="text-brand hover:underline">
                            {payment.patientName ?? t("billing.fallback.patient")}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {payment.invoiceId ? (
                            <Link href={`/billing/invoices/${payment.invoiceId}`} className="text-brand hover:underline">
                              Ver recibo
                            </Link>
                          ) : (
                            "Anticipo"
                          )}
                        </TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                        <TableCell>{payment.reference ?? "—"}</TableCell>
                        <TableCell>
                          <PaymentStateBadge payment={payment} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <Money amount={payment.amount} currency={payment.currency} />
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.refundedAmount > 0 ? (
                            <Money amount={payment.refundedAmount} currency={payment.currency} />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {(canVoid || canRefund) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Acciones del pago">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canVoid && (
                                  <DropdownMenuItem onSelect={() => setVoiding(payment)}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Anular
                                  </DropdownMenuItem>
                                )}
                                {canRefund && (
                                  <DropdownMenuItem onSelect={() => setRefunding(payment)}>
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Devolver
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-4 pb-3">
                <BillingPager pagination={payments.data.pagination} onPageChange={setPaymentsPage} noun="pagos" />
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          {refunds.isError && (
            <Alert variant="destructive">
              <AlertDescription>{billingErrorMessage(refunds.error)}</AlertDescription>
            </Alert>
          )}
          {refunds.isPending ? (
            <TableSkeleton columns={5} label={t("billing.payments.loadingRefunds")} />
          ) : refunds.data && refunds.data.entities.length === 0 ? (
            <EmptyState icon={Undo2} variant="card" title={t("billing.payments.emptyRefunds")} description={t("billing.payments.emptyRefundsDescription")} />
          ) : refunds.data ? (
            <div className="bento overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.table.date")}</TableHead>
                    <TableHead>{t("billing.table.method")}</TableHead>
                    <TableHead>{t("billing.table.reason")}</TableHead>
                    <TableHead>{t("billing.table.registeredBy")}</TableHead>
                    <TableHead className="text-right">{t("billing.table.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.data.entities.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="whitespace-nowrap">{formatBillingDateTime(refund.refundedAt)}</TableCell>
                      <TableCell>{PAYMENT_METHOD_LABELS[refund.method]}</TableCell>
                      <TableCell className="max-w-xs truncate" title={refund.reason}>
                        {refund.reason}
                      </TableCell>
                      <TableCell>{refund.refundedBy ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        <Money amount={refund.amount} currency={refund.currency} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 pb-3">
                <BillingPager pagination={refunds.data.pagination} onPageChange={setRefundsPage} noun="devoluciones" />
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={voiding !== null}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Anular pago"
        description="Anular sirve para corregir un pago mal registrado. Si el dinero ya se entregó y hay que devolverlo, usa «Devolver»."
        confirmLabel="Anular pago"
        onConfirm={async (reason) => {
          if (!voiding) return;
          await voidPayment.mutateAsync({ id: voiding.id, reason });
          notify.success("Pago anulado", { description: `${voiding.amount.toFixed(2)} ${voiding.currency}` });
        }}
        renderErrorAction={(error) =>
          isConflictError(error) && voiding && permissions.canRefund && canBeRefunded(voiding) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const payment = voiding;
                setVoiding(null);
                setRefunding(payment);
              }}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Devolver en su lugar
            </Button>
          ) : null
        }
      />
      <RefundDialog payment={refunding} onOpenChange={(open) => !open && setRefunding(null)} />
    </div>
  );
}
