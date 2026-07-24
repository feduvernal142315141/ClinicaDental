import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { billingService } from "@/lib/services/billing";
import { notify } from "@/lib/utils/notify";
import { localTodayInput, localInputToIso } from "@/lib/datetime";
import {
  paymentFormSchema,
  type PaymentFormValues,
} from "./payment-form.schema";
import type { PaymentMethod, PaymentResponse } from "@/lib/entity/billing";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface UseRegisterPaymentOptions {
  patientId: string;
  defaultCurrency: string;
  defaultInvoiceId?: string;
  onSuccess?: (payment: PaymentResponse) => void;
}

export function useRegisterPayment({
  patientId,
  defaultCurrency,
  defaultInvoiceId,
  onSuccess,
}: UseRegisterPaymentOptions) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    mode: "onBlur",
    defaultValues: {
      amount: undefined as unknown as number,
      currency: defaultCurrency,
      exchangeRate: 1,
      method: "CASH" as PaymentMethod,
      invoiceId: defaultInvoiceId ?? "",
      reference: "",
      notes: "",
      paidAtLocal: localTodayInput(),
    },
  });

  const submit = useCallback(
    async (values: PaymentFormValues) => {
      setSubmitting(true);
      try {
        const payment = await billingService.registerPayment({
          patientId,
          invoiceId: values.invoiceId || undefined,
          amount: values.amount,
          currency: values.currency,
          exchangeRate: values.exchangeRate ?? 1,
          method: values.method,
          reference: values.reference?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          paidAt: localInputToIso(values.paidAtLocal),
        });

        notify.success("Pago registrado", {
          description:
            "El cobro quedó anotado en la cuenta del paciente. El saldo se actualizó.",
        });
        onSuccess?.(payment);
        return payment;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al registrar el pago"), {
          description:
            "No se pudo guardar el pago. Verifica el monto, la factura y tu conexión.",
        });
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [patientId, onSuccess],
  );

  return { form, submitting, submit };
}
