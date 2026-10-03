"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { BillingLineItem, BillingLineItemInput } from "@/lib/entity/billing";
import { localTodayInput } from "@/lib/datetime";
import { calcDocumentTotal, calcLineTotal, roundMoney } from "@/lib/utils/billing-currency";
import { emptyLine, makeDocumentFormSchema, type LineFormValues } from "./document-form.schema";
import { useBillingPermissions } from "./use-billing-permissions";
import { useExchangeRate, useFinanceSettings } from "./use-billing-queries";

type Schema = ReturnType<typeof makeDocumentFormSchema>;
export type DocumentFormInput = z.input<Schema>;
export type DocumentFormOutput = z.output<Schema>;
export type DocumentForm = UseFormReturn<DocumentFormInput, unknown, DocumentFormOutput>;

interface UseDocumentFormOptions {
  kind: "estimate" | "invoice";
  defaults: Partial<DocumentFormInput>;
  /** Cambia cuando llegan datos asíncronos (plan, documento existente): re-inicializa el formulario. */
  resetKey?: string;
}

/**
 * Estado compartido de los formularios de presupuesto y recibo: schema con las reglas del
 * backend, moneda/tasa con autocompletado desde la tasa vigente y vista previa de totales.
 */
export function useDocumentForm({ kind, defaults, resetKey }: UseDocumentFormOptions) {
  const settingsQuery = useFinanceSettings();
  const baseCurrency = settingsQuery.data?.baseCurrency ?? "NIO";
  const permissions = useBillingPermissions();
  const today = localTodayInput();

  const schema = useMemo(
    () =>
      makeDocumentFormSchema({
        baseCurrency,
        today,
        allowEmptyLines: kind === "invoice",
        dateLabel: kind === "estimate" ? "La validez" : "El vencimiento",
      }),
    [baseCurrency, today, kind],
  );

  const initialValues = (): DocumentFormInput => ({
    patientId: "",
    lines: kind === "estimate" ? [emptyLine()] : [],
    chargeIds: [],
    discount: 0,
    currency: baseCurrency,
    notes: "",
    ...defaults,
  });

  const form: DocumentForm = useForm<DocumentFormInput, unknown, DocumentFormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: initialValues(),
  });

  // Re-inicializa cuando llegan datos asíncronos o la moneda base de la configuración.
  const lastResetKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    const key = `${resetKey ?? ""}|${settingsQuery.data ? baseCurrency : ""}`;
    if (lastResetKey.current === key) return;
    lastResetKey.current = key;
    form.reset(initialValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, baseCurrency, settingsQuery.data]);

  const currency = useWatch({ control: form.control, name: "currency" });
  const rateQuery = useExchangeRate(currency, baseCurrency);

  // Autocompleta la tasa vigente al elegir otra moneda (si el usuario no escribió una).
  useEffect(() => {
    if (currency === baseCurrency) {
      form.setValue("exchangeRate", undefined);
      return;
    }
    const rate = rateQuery.data?.rate;
    if (rate !== undefined && form.getValues("exchangeRate") === undefined) {
      form.setValue("exchangeRate", rate, { shouldValidate: true });
    }
  }, [currency, baseCurrency, rateQuery.data, form]);

  const lines = useWatch({ control: form.control, name: "lines" }) as LineFormValues[] | undefined;
  const discount = useWatch({ control: form.control, name: "discount" });

  return {
    form,
    baseCurrency,
    settings: settingsQuery.data,
    settingsLoading: settingsQuery.isPending,
    permissions,
    rateQuery,
    preview: previewTotals(lines ?? [], Number(discount) || 0),
  };
}

/** Vista previa con las mismas reglas del backend (el guardado pinta lo que devuelve el backend). */
export function previewTotals(lines: LineFormValues[], discount: number, extraSubtotal = 0) {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
      return sum + calcLineTotal(quantity, unitPrice, Number(line.discount) || 0);
    }, 0) + extraSubtotal,
  );
  return { subtotal, discount: roundMoney(discount), total: calcDocumentTotal(subtotal, discount) };
}

/** Formulario → líneas del request; sin permiso de descuento no se envía descuento. */
export function toLineInputs(lines: DocumentFormOutput["lines"], canDiscount: boolean): BillingLineItemInput[] {
  return lines.map((line) => ({
    serviceId: line.serviceId || undefined,
    description: line.description.trim(),
    toothRef: line.toothRef || undefined,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount: canDiscount && line.discount ? line.discount : undefined,
  }));
}

/** Líneas de un documento existente → valores del formulario. */
export function fromLineItems(items: BillingLineItem[]): LineFormValues[] {
  return items
    .filter((item) => !item.chargeId)
    .map((item) => ({
      serviceId: item.serviceId ?? undefined,
      description: item.description,
      toothRef: item.toothRef ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    }));
}
