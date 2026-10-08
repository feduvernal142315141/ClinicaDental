"use client";

import { AlertCircle, Loader2 } from "lucide-react";
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
  Textarea,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { PAYMENT_METHOD_LABELS, type PaymentResponse, type RefundMethod } from "@/lib/entity/billing";
import { useRefundForm } from "@/lib/hooks/billing/use-refund-form";
import { formatMoney } from "@/lib/utils/billing-currency";
import { notify } from "@/lib/utils/notify";
import { NumberInput } from "../shared/NumberInput";

const REFUND_METHODS: RefundMethod[] = ["CASH", "CARD_POS", "TRANSFER", "OTHER"];

interface RefundDialogProps {
  payment: PaymentResponse | null;
  onOpenChange: (open: boolean) => void;
}

/** Devolver dinero de un pago (`billing_adjust` DELETE). */
export function RefundDialog({ payment, onOpenChange }: RefundDialogProps) {
  const open = payment !== null;
  const { form, submit, submitting, max } = useRefundForm({
    open,
    payment,
    onSuccess: (refund) => {
      notify.success("Devolución registrada", { description: formatMoney(refund.amount, refund.currency) });
      onOpenChange(false);
    },
  });
  const rootError = form.formState.errors.root?.message;
  const reasonLength = (form.watch("reason") ?? "").length;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Devolver dinero</DialogTitle>
          <DialogDescription className="text-subtle">
            {payment
              ? `Pago de ${formatMoney(payment.amount, payment.currency)}${payment.patientName ? ` · ${payment.patientName}` : ""}. Si estaba aplicado a un recibo, el recibo vuelve a deber esa parte.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a devolver</FormLabel>
                  <FormControl>
                    <NumberInput {...field} min={0} />
                  </FormControl>
                  <FormDescription>Máximo: {payment ? formatMoney(max, payment.currency) : "—"}</FormDescription>
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
                  <FormControl>
                    <SearchSelect
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={REFUND_METHODS.map((method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }))}
                      aria-label="Método de devolución"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} maxLength={500} placeholder="Explica brevemente el motivo" />
                  </FormControl>
                  <div className="flex justify-between gap-2">
                    <FormMessage />
                    <span className="ml-auto text-xs tabular-nums text-subtle">{reasonLength}/500</span>
                  </div>
                </FormItem>
              )}
            />
            {rootError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Devolver
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
