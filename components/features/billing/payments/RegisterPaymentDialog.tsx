"use client";

import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import {
  PAYMENT_METHOD_LABELS,
  type InvoiceResponse,
  type PaymentMethod,
  type PaymentResponse,
} from "@/lib/entity/billing";
import { usePaymentForm } from "@/lib/hooks/billing/use-payment-form";
import { nowLocalInput } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils/billing-currency";
import { notify } from "@/lib/utils/notify";
import { currencyOptions } from "../shared/CurrencyRateFields";
import { NumberInput } from "../shared/NumberInput";

export interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string | null;
  /** Recibos del paciente (se ofrecen los que tienen saldo). */
  invoices: InvoiceResponse[];
  /** Recibo fijo (abierto desde el detalle del recibo). */
  invoiceId?: string;
  creditBalance?: number;
  onSuccess?: (payment: PaymentResponse) => void;
}

const ADVANCE_OPTION = "__advance__";
const METHODS: PaymentMethod[] = ["CASH", "CARD_POS", "TRANSFER", "ADVANCE", "OTHER"];

/** E. Registrar pago: modal reutilizable desde la cuenta del paciente, el recibo y la lista. */
export function RegisterPaymentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  invoices,
  invoiceId,
  creditBalance = 0,
  onSuccess,
}: RegisterPaymentDialogProps) {
  const payment = usePaymentForm({
    open,
    patientId,
    invoices,
    invoiceId,
    creditBalance,
    onSuccess: (saved, replayed) => {
      notify.success(replayed ? "El pago ya estaba registrado" : "Pago registrado", {
        description: `${formatMoney(saved.amount, saved.currency)} · ${PAYMENT_METHOD_LABELS[saved.method]}`,
      });
      onSuccess?.(saved);
      onOpenChange(false);
    },
  });
  const { form, invoice, baseCurrency, currency } = payment;

  const invoiceOptions = [
    ...(payment.allowAdvances ? [{ value: ADVANCE_OPTION, label: "Anticipo (sin recibo)" }] : []),
    ...payment.payable.map((i) => ({
      value: i.id,
      label: `${i.code} · saldo ${formatMoney(i.balance, i.currency)}`,
    })),
  ];

  const methodOptions = METHODS.filter(
    (method) => method !== "ADVANCE" || (creditBalance > 0 && !!invoice),
  ).map((method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }));

  const suggestsReference = payment.method === "CARD_POS" || payment.method === "TRANSFER";

  return (
    <Dialog open={open} onOpenChange={(next) => !payment.submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-bento border-hairline bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-ink">Registrar pago</DialogTitle>
          <DialogDescription className="text-subtle">
            {patientName ? `${patientName} · ` : ""}Anota un cobro recibido. No procesa pagos con tarjeta: solo deja
            constancia.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={payment.submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="invoiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recibo</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value || (payment.allowAdvances ? ADVANCE_OPTION : "")}
                      onChange={(value) => payment.onInvoiceChange(value === ADVANCE_OPTION ? "" : value)}
                      options={invoiceOptions}
                      disabled={!!invoiceId}
                      placeholder="Selecciona el recibo"
                      aria-label="Recibo"
                    />
                  </FormControl>
                  {invoice && (
                    <FormDescription>
                      Saldo pendiente:{" "}
                      <span className="font-semibold text-ink">{formatMoney(invoice.balance, invoice.currency)}</span>
                    </FormDescription>
                  )}
                  {!field.value && payment.allowAdvances && (
                    <FormDescription>Queda como saldo a favor del paciente.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <NumberInput {...field} min={0} placeholder="0.00" />
                      </FormControl>
                      {invoice && (
                        <Button type="button" variant="outline" onClick={payment.payBalance}>
                          Pagar saldo
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          form.setValue("exchangeRate", undefined);
                        }}
                        options={currencyOptions(baseCurrency, invoice?.currency, field.value)}
                        aria-label="Moneda del pago"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {currency !== baseCurrency && (
              <FormField
                control={form.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tasa ({currency} por 1 {baseCurrency})
                    </FormLabel>
                    <FormControl>
                      <NumberInput {...field} decimals={8} min={0} />
                    </FormControl>
                    <FormDescription>
                      {payment.rateQuery.isFetching
                        ? "Buscando la tasa vigente…"
                        : payment.rateQuery.data === null
                          ? "No hay tasa registrada: escríbela (puedes guardarla en Configuración)."
                          : payment.rateQuery.data
                            ? `Tasa vigente del ${payment.rateQuery.data.asOf}`
                            : null}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {invoice && payment.equivalent !== null && (
              <p className="rounded-lg bg-hover px-3 py-2 text-sm text-ink">
                Equivale a <strong>{formatMoney(payment.equivalent, invoice.currency)}</strong> en la moneda del recibo.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={methodOptions}
                        aria-label="Método de pago"
                      />
                    </FormControl>
                    {field.value === "ADVANCE" && (
                      <FormDescription>Saldo a favor disponible: {formatMoney(creditBalance, baseCurrency)}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia{suggestsReference ? "" : " (opcional)"}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        maxLength={80}
                        placeholder={suggestsReference ? "N.º de voucher o transferencia" : "Opcional"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del pago</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} max={nowLocalInput()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={500} placeholder="Opcional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {payment.submitErrorMessage && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {payment.submitErrorMessage}
                  {payment.canRetry && " Puedes reintentar: no se duplicará el cobro."}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={payment.submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={payment.submitting || payment.settingsLoading}>
                {payment.submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : payment.canRetry ? (
                  <RotateCw className="mr-2 h-4 w-4" />
                ) : null}
                {payment.canRetry ? "Reintentar" : "Cobrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
