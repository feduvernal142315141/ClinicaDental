"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ChargeResponse } from "@/lib/entity/billing";
import { amountSchema } from "@/lib/entity/billing/schemas";
import { localInputToIso, nowLocalInput } from "@/lib/datetime";
import { billingErrorMessage, isModuleDisabledError } from "@/lib/services/billing";
import { useCreateCharge } from "./use-billing-mutations";

const manualChargeSchema = z
  .object({
    patientId: z.string().min(1, "Selecciona un paciente."),
    serviceId: z.string().optional(),
    description: z
      .string()
      .trim()
      .min(1, "La descripción es obligatoria.")
      .max(200, "La descripción admite como máximo 200 caracteres."),
    toothRef: z.string().max(20, "La pieza admite como máximo 20 caracteres.").optional(),
    quantity: amountSchema({ label: "La cantidad", positive: true }),
    unitPrice: amountSchema({ label: "El precio" }),
    performedAt: z.string().min(1, "Indica cuándo se realizó."),
  })
  .superRefine((values, ctx) => {
    const performed = new Date(values.performedAt);
    if (!Number.isNaN(performed.getTime()) && performed.getTime() > Date.now() + 60_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["performedAt"], message: "La fecha no puede ser futura." });
    }
  });

export type ManualChargeInput = z.input<typeof manualChargeSchema>;
type ManualChargeOutput = z.output<typeof manualChargeSchema>;

/** "Cargo manual" (§8.H): servicio opcional, descripción, pieza, cantidad, precio y fecha. */
export function useManualChargeForm({
  open,
  patientId,
  onSuccess,
}: {
  open: boolean;
  patientId?: string;
  onSuccess?: (charge: ChargeResponse) => void;
}) {
  const create = useCreateCharge();
  const defaults = (): ManualChargeInput => ({
    patientId: patientId ?? "",
    description: "",
    toothRef: "",
    quantity: 1,
    unitPrice: undefined as unknown as number,
    performedAt: nowLocalInput(),
  });

  const form = useForm<ManualChargeInput, unknown, ManualChargeOutput>({
    resolver: zodResolver(manualChargeSchema),
    mode: "onBlur",
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patientId]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    try {
      const charge = await create.mutateAsync({
        patientId: values.patientId,
        serviceId: values.serviceId || undefined,
        description: values.description,
        toothRef: values.toothRef?.trim() || undefined,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        performedAt: localInputToIso(values.performedAt),
      });
      onSuccess?.(charge);
    } catch (error) {
      if (!isModuleDisabledError(error)) form.setError("root", { message: billingErrorMessage(error) });
    }
  });

  return { form, submit, submitting: create.isPending };
}
