"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { ExchangeRateResponse } from "@/lib/entity/billing";
import { exchangeRateValueSchema, currencyCodeSchema } from "@/lib/entity/billing/schemas";
import { billingErrorMessage, isConflictError, isModuleDisabledError } from "@/lib/services/billing";
import { localTodayInput } from "@/lib/datetime";
import { billingKeys } from "./billing-query-keys";
import { useSetExchangeRate, useUpdateFinanceSettings } from "./use-billing-mutations";
import { useFinanceSettings } from "./use-billing-queries";

/** "" = usar la moneda de la clínica (se envía `null`). */
export const CLINIC_CURRENCY = "";

const settingsSchema = z.object({
  baseCurrency: z.union([z.literal(CLINIC_CURRENCY), currencyCodeSchema]),
  chargePolicy: z.enum(["OFF", "SUGGEST", "AUTO"]),
  allowAdvances: z.boolean(),
  requireCashSession: z.boolean(),
  maxDiscountPercent: z
    .number({ invalid_type_error: "El descuento máximo es obligatorio." })
    .min(0, "El descuento máximo no puede ser negativo.")
    .max(100, "El descuento máximo no puede superar 100%."),
});

type SettingsInput = z.input<typeof settingsSchema>;

/**
 * Configuración de Finanzas (§8.J, solo Administrador). El PUT envía la `version` del último
 * GET; si responde 409 (otro la cambió, o la moneda base ya está bloqueada) se recarga.
 */
export function useFinanceSettingsForm({ onSaved }: { onSaved?: () => void } = {}) {
  const queryClient = useQueryClient();
  const settings = useFinanceSettings();
  const update = useUpdateFinanceSettings();
  const [baseCurrencyLocked, setBaseCurrencyLocked] = useState(false);

  const form = useForm<SettingsInput, unknown, z.output<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    mode: "onBlur",
    defaultValues: {
      baseCurrency: CLINIC_CURRENCY,
      chargePolicy: "SUGGEST",
      allowAdvances: true,
      requireCashSession: false,
      maxDiscountPercent: 0,
    },
  });

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    form.reset({
      baseCurrency: data.baseCurrencyConfigured ? data.baseCurrency : CLINIC_CURRENCY,
      chargePolicy: data.chargePolicy,
      allowAdvances: data.allowAdvances,
      requireCashSession: data.requireCashSession,
      maxDiscountPercent: data.maxDiscountPercent,
    });
  }, [settings.data, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!settings.data) return;
    form.clearErrors("root");
    try {
      await update.mutateAsync({
        baseCurrency: values.baseCurrency === CLINIC_CURRENCY ? null : values.baseCurrency,
        chargePolicy: values.chargePolicy,
        allowAdvances: values.allowAdvances,
        requireCashSession: values.requireCashSession,
        maxDiscountPercent: values.maxDiscountPercent,
        version: settings.data.version,
      });
      onSaved?.();
    } catch (error) {
      if (isModuleDisabledError(error)) return;
      const message = billingErrorMessage(error);
      if (isConflictError(error)) {
        if (message.includes("moneda base")) setBaseCurrencyLocked(true);
        await queryClient.invalidateQueries({ queryKey: billingKeys.settings() });
      }
      form.setError("root", { message });
    }
  });

  return {
    form,
    submit,
    settings: settings.data,
    loading: settings.isPending,
    loadError: settings.isError ? billingErrorMessage(settings.error) : null,
    submitting: update.isPending,
    baseCurrencyLocked,
  };
}

const rateSchema = z.object({
  target: currencyCodeSchema,
  rate: exchangeRateValueSchema,
  asOf: z.string().min(1, "Indica la fecha."),
});

type RateInput = z.input<typeof rateSchema>;

/** Registrar una tasa: unidades de `target` por 1 de la moneda base, a una fecha no futura. */
export function useExchangeRateForm(
  baseCurrency: string | undefined,
  { onSaved }: { onSaved?: (rate: ExchangeRateResponse) => void } = {},
) {
  const setRate = useSetExchangeRate();
  const form = useForm<RateInput, unknown, z.output<typeof rateSchema>>({
    resolver: zodResolver(
      rateSchema.superRefine((values, ctx) => {
        if (values.target === baseCurrency) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["target"], message: "La moneda base siempre vale 1." });
        }
        if (values.asOf > localTodayInput()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["asOf"],
            message: "La fecha del tipo de cambio no puede estar en el futuro.",
          });
        }
      }),
    ),
    mode: "onBlur",
    defaultValues: { target: "USD", rate: undefined as unknown as number, asOf: localTodayInput() },
  });

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    try {
      onSaved?.(await setRate.mutateAsync(values));
    } catch (error) {
      if (!isModuleDisabledError(error)) form.setError("root", { message: billingErrorMessage(error) });
    }
  });

  return { form, submit, submitting: setRate.isPending };
}
