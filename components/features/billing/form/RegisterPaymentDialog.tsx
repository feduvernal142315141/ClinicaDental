"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/shadcn/dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/atomic/forms/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import { useRegisterPayment } from "@/lib/hooks/billing";
import {
  PAYMENT_METHOD_LABELS,
  type InvoiceResponse,
  type PaymentMethod,
} from "@/lib/entity/billing";
import { formatMoney } from "@/lib/utils/billing-currency";
import { getClinicCurrencySymbol } from "@/lib/utils/clinic-regional-format";
import { localTodayInput } from "@/lib/datetime";

interface RegisterPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  currency: string;
  invoices: InvoiceResponse[];
  defaultInvoiceId?: string;
  onSuccess?: () => void;
}

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function RegisterPaymentDialog({
  open,
  onClose,
  patientId,
  currency,
  invoices,
  defaultInvoiceId,
  onSuccess,
}: RegisterPaymentDialogProps) {
  const openInvoices = invoices.filter(
    (i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID",
  );

  const { form, submitting, submit } = useRegisterPayment({
    patientId,
    defaultCurrency: currency,
    defaultInvoiceId,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    const preferredInvoice =
      defaultInvoiceId ??
      invoices.find(
        (i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID",
      )?.id ??
      "";
    form.reset({
      amount: undefined as unknown as number,
      currency,
      exchangeRate: 1,
      method: "CASH",
      invoiceId: preferredInvoice,
      reference: "",
      notes: "",
      paidAtLocal: localTodayInput(),
    });
    // Solo reset al abrir / cambiar defaults — no depender de la lista completa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currency, defaultInvoiceId, patientId]);

  const selectedInvoiceId = form.watch("invoiceId");
  const selectedInvoice = openInvoices.find((i) => i.id === selectedInvoiceId);
  const method = form.watch("method");
  const symbol = getClinicCurrencySymbol(currency);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md rounded-bento border-hairline bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-ink">Registrar pago</DialogTitle>
          <DialogDescription className="text-subtle">
            Anota un cobro en efectivo, POS o transferencia. No procesa el pago:
            solo deja constancia en la cuenta del paciente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="space-y-4 pt-1"
          >
            <FormField
              control={form.control}
              name="invoiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aplicar a factura</FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? "" : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona factura" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">
                        Abono a cuenta (sin factura)
                      </SelectItem>
                      {openInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.code} · saldo{" "}
                          {formatMoney(inv.balance, inv.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {selectedInvoice && (
                    <p className="text-xs text-subtle">
                      Saldo pendiente:{" "}
                      <span className="font-semibold text-ink">
                        {formatMoney(
                          selectedInvoice.balance,
                          selectedInvoice.currency,
                        )}
                      </span>
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                          {symbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-9"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(method === "CARD_POS" || method === "TRANSFER") && (
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {method === "CARD_POS"
                        ? "Referencia / voucher POS"
                        : "Nº de transferencia"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          method === "CARD_POS" ? "Ej. 458921" : "Ej. TRX-9921"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paidAtLocal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y hora</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Observaciones del cobro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : "Registrar pago"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
