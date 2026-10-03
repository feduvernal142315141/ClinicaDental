"use client";

import { Loader2, Save } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import type { ExchangeRateResponse } from "@/lib/entity/billing";
import type { DocumentForm } from "@/lib/hooks/billing/use-document-form";
import { useSetExchangeRate } from "@/lib/hooks/billing";
import { notify } from "@/lib/utils/notify";
import { NumberInput } from "./NumberInput";
import { notifyBillingError } from "./billing-notify";

/** Monedas habituales de la región; la base y las ya usadas se añaden siempre. */
export const COMMON_CURRENCIES = ["NIO", "USD", "EUR", "CRC", "HNL", "GTQ", "MXN", "BOB", "COP", "PEN"];

export function currencyOptions(...first: (string | null | undefined)[]) {
  const codes = Array.from(new Set([...first.filter((c): c is string => !!c), ...COMMON_CURRENCIES]));
  return codes.map((code) => ({ value: code, label: code }));
}

interface CurrencyRateFieldsProps {
  form: DocumentForm;
  baseCurrency: string;
  rateQuery: UseQueryResult<ExchangeRateResponse | null>;
  /** Registrar una tasa requiere `billing` EDIT. */
  canSaveRate: boolean;
  disabled?: boolean;
}

/**
 * Moneda del documento y su tasa (unidades de esa moneda por 1 de la base). Se autocompleta con
 * la tasa vigente; si no hay ninguna (404), se escribe a mano y se puede guardar ahí mismo.
 */
export function CurrencyRateFields({ form, baseCurrency, rateQuery, canSaveRate, disabled }: CurrencyRateFieldsProps) {
  const currency = form.watch("currency");
  const rate = form.watch("exchangeRate");
  const setRate = useSetExchangeRate();
  const noStoredRate = currency !== baseCurrency && rateQuery.isSuccess && rateQuery.data === null;

  const saveRate = async () => {
    if (rate === undefined) return;
    try {
      await setRate.mutateAsync({ target: currency, rate });
      notify.success("Tasa guardada", { description: `1 ${baseCurrency} = ${rate} ${currency}` });
    } catch (error) {
      notifyBillingError(error, "No se pudo guardar la tasa");
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
                onBlur={field.onBlur}
                options={currencyOptions(baseCurrency, field.value)}
                disabled={disabled}
                aria-label="Moneda"
              />
            </FormControl>
            <FormDescription>Moneda base de la clínica: {baseCurrency}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {currency !== baseCurrency && (
        <FormField
          control={form.control}
          name="exchangeRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Tasa ({currency} por 1 {baseCurrency})
              </FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <NumberInput {...field} decimals={8} min={0} disabled={disabled} placeholder="0.0000" />
                </FormControl>
                {noStoredRate && canSaveRate && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveRate}
                    disabled={rate === undefined || setRate.isPending}
                    title="Guardar como tasa vigente"
                  >
                    {setRate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="sr-only sm:not-sr-only sm:ml-2">Guardar tasa</span>
                  </Button>
                )}
              </div>
              <FormDescription>
                {rateQuery.isFetching
                  ? "Buscando la tasa vigente…"
                  : noStoredRate
                    ? "No hay tasa registrada para esta moneda: escríbela."
                    : rateQuery.data
                      ? `Tasa vigente del ${rateQuery.data.asOf}`
                      : null}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
