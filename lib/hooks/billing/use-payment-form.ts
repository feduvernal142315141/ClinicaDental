"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { InvoiceResponse, PaymentMethod, PaymentResponse } from "@/lib/entity/billing";
import {
  amountSchema,
  currencyCodeSchema,
  exchangeRateValueSchema,
  paymentMethodSchema,
} from "@/lib/entity/billing/schemas";
import { localInputToIso, nowLocalInput } from "@/lib/datetime";
import { billingErrorMessage, isBillingApiError, isModuleDisabledError } from "@/lib/services/billing";
import { convertAmount } from "@/lib/utils/billing-currency";
import { useRegisterPayment } from "./use-billing-mutations";
import { useExchangeRate, useFinanceSettings } from "./use-billing-queries";
import { useIdempotencyKey } from "./use-idempotency-key";

function makePaymentSchema(baseCurrency: string, allowAdvances: boolean, creditBalance: number) {
  return z
    .object({
      invoiceId: z.string(),
      amount: amountSchema({ label: "El monto", positive: true }),
      currency: currencyCodeSchema,
      exchangeRate: exchangeRateValueSchema.optional(),
      method: paymentMethodSchema,
      reference: z.string().max(80, "La referencia admite como máximo 80 caracteres.").optional(),
      paidAt: z.string().min(1, "Indica la fecha del pago."),
      notes: z.string().max(500, "Las notas admiten como máximo 500 caracteres.").optional(),
    })
    .superRefine((values, ctx) => {
      if (!values.invoiceId && !allowAdvances) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceId"], message: "Selecciona el recibo a pagar." });
      }
      if (values.method === "ADVANCE") {
        if (!values.invoiceId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["method"],
            message: "El saldo a favor solo paga un recibo: selecciona cuál.",
          });
        }
        if (creditBalance <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["method"], message: "El paciente no tiene saldo a favor." });
        }
      }
      if (values.currency !== baseCurrency && values.exchangeRate === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exchangeRate"],
          message: `Indica la tasa: unidades de ${values.currency} por 1 ${baseCurrency}.`,
        });
      }
      const paidAt = new Date(values.paidAt);
      if (!Number.isNaN(paidAt.getTime()) && paidAt.getTime() > Date.now() + 60_000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paidAt"], message: "La fecha del pago no puede ser futura." });
      }
    });
}

export type PaymentFormInput = z.input<ReturnType<typeof makePaymentSchema>>;
export type PaymentFormOutput = z.output<ReturnType<typeof makePaymentSchema>>;

export interface UsePaymentFormOptions {
  open: boolean;
  patientId: string;
  /** Recibos que se pueden pagar (con saldo). */
  invoices: InvoiceResponse[];
  /** Recibo preseleccionado (abierto desde el detalle del recibo). */
  invoiceId?: string;
  /** Saldo a favor del paciente (habilita el método "Saldo a favor"). */
  creditBalance: number;
  onSuccess?: (payment: PaymentResponse, replayed: boolean) => void;
}

/**
 * Estado del modal "Registrar pago" (§8.E):
 * - una `Idempotency-Key` por apertura, reutilizada en reintentos;
 * - tasa autocompletada desde la vigente (o manual si no hay);
 * - monto por defecto = saldo del recibo; equivalencia en la moneda del recibo.
 */
export function usePaymentForm({ open, patientId, invoices, invoiceId, creditBalance, onSuccess }: UsePaymentFormOptions) {
  const settings = useFinanceSettings();
  const baseCurrency = settings.data?.baseCurrency ?? "NIO";
  const allowAdvances = settings.data?.allowAdvances ?? true;
  const idempotency = useIdempotencyKey();
  const mutation = useRegisterPayment();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const schema = useMemo(
    () => makePaymentSchema(baseCurrency, allowAdvances, creditBalance),
    [baseCurrency, allowAdvances, creditBalance],
  );

  const payable = useMemo(() => invoices.filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID"), [invoices]);

  const defaultsFor = (selectedId: string): PaymentFormInput => {
    const invoice = payable.find((i) => i.id === selectedId);
    return {
      invoiceId: selectedId,
      amount: invoice ? invoice.balance : (undefined as unknown as number),
      currency: invoice?.currency ?? baseCurrency,
      exchangeRate: invoice && invoice.currency !== baseCurrency ? invoice.exchangeRate : undefined,
      method: "CASH",
      reference: "",
      paidAt: nowLocalInput(),
      notes: "",
    };
  };

  const form = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: defaultsFor(invoiceId ?? payable[0]?.id ?? ""),
  });

  // Cada apertura del modal = un cobro nuevo = una clave nueva.
  useEffect(() => {
    if (!open) return;
    idempotency.reset();
    setSubmitError(null);
    form.reset(defaultsFor(invoiceId ?? payable[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId, baseCurrency]);

  const selectedInvoiceId = useWatch({ control: form.control, name: "invoiceId" });
  const currency = useWatch({ control: form.control, name: "currency" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const exchangeRate = useWatch({ control: form.control, name: "exchangeRate" });
  const method = useWatch({ control: form.control, name: "method" }) as PaymentMethod;
  const invoice = payable.find((i) => i.id === selectedInvoiceId);

  const rateQuery = useExchangeRate(currency, baseCurrency);
  useEffect(() => {
    if (currency === baseCurrency) {
      form.setValue("exchangeRate", undefined);
      return;
    }
    if (invoice && currency === invoice.currency && form.getValues("exchangeRate") === undefined) {
      form.setValue("exchangeRate", invoice.exchangeRate);
      return;
    }
    const rate = rateQuery.data?.rate;
    if (rate !== undefined && form.getValues("exchangeRate") === undefined) {
      form.setValue("exchangeRate", rate, { shouldValidate: true });
    }
  }, [currency, baseCurrency, rateQuery.data, invoice, form]);

  /** Tasa del pago contra la base (la base vale 1). */
  const paymentRate = currency === baseCurrency ? 1 : exchangeRate;

  /** "Equivale a X en moneda del recibo" (solo si la moneda difiere). */
  const equivalent =
    invoice && currency !== invoice.currency && paymentRate && Number.isFinite(Number(amount))
      ? convertAmount(Number(amount), paymentRate, invoice.exchangeRate)
      : null;

  /** Botón "Pagar saldo": el saldo del recibo expresado en la moneda del pago. */
  const payBalance = () => {
    if (!invoice) return;
    const value =
      currency === invoice.currency
        ? invoice.balance
        : paymentRate
          ? convertAmount(invoice.balance, invoice.exchangeRate, paymentRate)
          : invoice.balance;
    form.setValue("amount", value, { shouldValidate: true });
  };

  /** Cambiar de recibo recalcula monto y moneda; conserva método, referencia, fecha y notas. */
  const onInvoiceChange = (id: string) => {
    const keep = form.getValues();
    form.reset({
      ...defaultsFor(id),
      method: keep.method === "ADVANCE" && !id ? "CASH" : keep.method,
      reference: keep.reference,
      paidAt: keep.paidAt,
      notes: keep.notes,
    });
  };

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await mutation.mutateAsync({
        idempotencyKey: idempotency.current(),
        data: {
          patientId,
          invoiceId: values.invoiceId || undefined,
          amount: values.amount,
          currency: values.currency,
          exchangeRate: values.currency !== baseCurrency ? values.exchangeRate : undefined,
          method: values.method,
          reference: values.reference?.trim() || undefined,
          paidAt: localInputToIso(values.paidAt),
          notes: values.notes?.trim() || undefined,
        },
      });
      onSuccess?.(result.payment, result.replayed);
    } catch (error) {
      if (isModuleDisabledError(error)) return;
      // Misma clave en el reintento salvo que el backend diga que ya se usó con otro pago.
      idempotency.handleError(error);
      setSubmitError(error);
    }
  });

  const canRetry =
    isBillingApiError(submitError) && (submitError.kind === "network" || submitError.kind === "server");

  return {
    form,
    submit,
    submitting: mutation.isPending,
    submitError,
    submitErrorMessage: submitError ? billingErrorMessage(submitError) : null,
    canRetry,
    baseCurrency,
    allowAdvances,
    payable,
    invoice,
    method,
    currency,
    rateQuery,
    equivalent,
    payBalance,
    onInvoiceChange,
    settingsLoading: settings.isPending,
  };
}
