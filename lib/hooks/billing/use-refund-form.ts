"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { refundableAmount, type PaymentResponse, type RefundResponse } from "@/lib/entity/billing";
import { amountSchema, reasonSchema, refundMethodSchema } from "@/lib/entity/billing/schemas";
import { billingErrorMessage, isModuleDisabledError } from "@/lib/services/billing";
import { formatMoney } from "@/lib/utils/billing-currency";
import { useRefundPayment } from "./use-billing-mutations";

function makeRefundSchema(max: number, currency: string) {
  return z
    .object({
      amount: amountSchema({ label: "El monto", positive: true }),
      method: refundMethodSchema,
      reason: reasonSchema,
    })
    .superRefine((values, ctx) => {
      if (values.amount > max + 1e-9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: `Solo se pueden devolver ${formatMoney(max, currency)}.`,
        });
      }
    });
}

type RefundInput = z.input<ReturnType<typeof makeRefundSchema>>;
type RefundOutput = z.output<ReturnType<typeof makeRefundSchema>>;

/** "Devolver" (§8.F): monto ≤ monto − devuelto, método sin ADVANCE y motivo. */
export function useRefundForm({
  open,
  payment,
  onSuccess,
}: {
  open: boolean;
  payment: PaymentResponse | null;
  onSuccess?: (refund: RefundResponse) => void;
}) {
  const refund = useRefundPayment();
  const max = payment ? refundableAmount(payment) : 0;
  const schema = useMemo(() => makeRefundSchema(max, payment?.currency ?? ""), [max, payment?.currency]);

  const form = useForm<RefundInput, unknown, RefundOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { amount: max, method: "CASH", reason: "" },
  });

  useEffect(() => {
    if (open && payment) {
      form.reset({
        amount: refundableAmount(payment),
        method: payment.method === "ADVANCE" ? "CASH" : payment.method,
        reason: "",
      });
    }
  }, [open, payment, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!payment) return;
    form.clearErrors("root");
    try {
      const saved = await refund.mutateAsync({ paymentId: payment.id, data: values });
      onSuccess?.(saved);
    } catch (error) {
      if (!isModuleDisabledError(error)) form.setError("root", { message: billingErrorMessage(error) });
    }
  });

  return { form, submit, submitting: refund.isPending, max };
}
