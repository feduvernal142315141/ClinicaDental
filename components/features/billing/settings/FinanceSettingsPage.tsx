"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Lock, Save } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { CHARGE_POLICY_LABELS, type ChargePolicy } from "@/lib/entity/billing";
import { useBillingPermissions, useExchangeRate, useFinanceSettings } from "@/lib/hooks/billing";
import {
  CLINIC_CURRENCY,
  useExchangeRateForm,
  useFinanceSettingsForm,
} from "@/lib/hooks/billing/use-finance-settings-form";
import { localTodayInput } from "@/lib/datetime";
import { notify } from "@/lib/utils/notify";
import { COMMON_CURRENCIES, currencyOptions } from "../shared/CurrencyRateFields";
import { NumberInput } from "../shared/NumberInput";
import { FinanceNoPermission } from "../module/FinanceModuleUnavailable";
import { formatBillingDate } from "../shared/billing-format";

const POLICIES: ChargePolicy[] = ["SUGGEST", "AUTO", "OFF"];

function SettingsForm() {
  const { form, submit, settings, loading, loadError, submitting, baseCurrencyLocked } = useFinanceSettingsForm({
    onSaved: () => notify.success("Configuración guardada"),
  });
  const rootError = form.formState.errors.root?.message;

  if (loading) return <LoadingSpinner message="Cargando configuración..." />;
  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        className="bento space-y-6 p-5"
        noValidate
        onSubmit={submit}
      >
        <FormField
          control={form.control}
          name="baseCurrency"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel>Moneda base</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value || "__clinic__"}
                  onChange={(value) => field.onChange(value === "__clinic__" ? CLINIC_CURRENCY : value)}
                  options={[
                    { value: "__clinic__", label: "Usar la de la clínica" },
                    ...currencyOptions(settings?.baseCurrency).filter((o) => o.value),
                  ]}
                  disabled={baseCurrencyLocked}
                  aria-label="Moneda base"
                />
              </FormControl>
              <FormDescription>
                {baseCurrencyLocked ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Bloqueada: ya hay documentos de finanzas.
                  </span>
                ) : (
                  `Vigente: ${settings?.baseCurrency}. Se bloquea en cuanto existan documentos.`
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chargePolicy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Política de cargos al completar una cita</FormLabel>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                  {POLICIES.map((policy) => (
                    <label
                      key={policy}
                      className="flex cursor-pointer gap-3 rounded-xl border border-hairline p-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
                    >
                      <RadioGroupItem value={policy} className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium text-ink">{CHARGE_POLICY_LABELS[policy].label}</span>
                        <span className="block text-xs text-subtle">{CHARGE_POLICY_LABELS[policy].description}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="allowAdvances"
            render={({ field }) => (
              <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-hairline p-3">
                <div>
                  <FormLabel>Permitir anticipos</FormLabel>
                  <FormDescription>Pagos sin recibo que quedan como saldo a favor.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="requireCashSession"
            render={({ field }) => (
              <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-hairline p-3">
                <div>
                  <FormLabel>Exigir caja abierta para efectivo</FormLabel>
                  <FormDescription>Sin caja abierta no se cobra ni devuelve en efectivo.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="maxDiscountPercent"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Descuento máximo (%)</FormLabel>
              <FormControl>
                <NumberInput {...field} min={0} max={100} />
              </FormControl>
              <FormDescription>Sobre el bruto del documento. No aplica al Administrador.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {rootError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {rootError} Se recargaron los valores vigentes.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar configuración
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ExchangeRatesSection({ baseCurrency }: { baseCurrency: string }) {
  const [lookup, setLookup] = useState(COMMON_CURRENCIES.find((c) => c !== baseCurrency) ?? "USD");
  const { form, submit, submitting } = useExchangeRateForm(baseCurrency, {
    onSaved: (saved) => {
      notify.success("Tasa registrada", { description: `1 ${saved.base} = ${saved.rate} ${saved.target}` });
      setLookup(saved.target);
    },
  });
  const current = useExchangeRate(lookup, baseCurrency);
  const rootError = form.formState.errors.root?.message;

  return (
    <section aria-labelledby="exchange-rates" className="bento space-y-5 p-5">
      <div>
        <h2 id="exchange-rates" className="text-base font-semibold text-ink">
          Tipos de cambio
        </h2>
        <p className="text-sm text-subtle">Unidades de cada moneda por 1 {baseCurrency}. La moneda base vale 1.</p>
      </div>

      <Form {...form}>
        <form
          className="grid items-start gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_11rem_auto]"
          noValidate
          onSubmit={submit}
        >
          <FormField
            control={form.control}
            name="target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={currencyOptions(field.value).filter((o) => o.value !== baseCurrency)}
                    aria-label="Moneda de la tasa"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tasa</FormLabel>
                <FormControl>
                  <NumberInput {...field} decimals={8} min={0} placeholder="0.0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="asOf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} max={localTodayInput()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="sm:mt-[1.6rem]" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
          {rootError && (
            <Alert variant="destructive" className="sm:col-span-4" role="alert">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4 text-sm">
        <span className="text-subtle">Consultar la vigente:</span>
        <div className="w-32">
          <SearchSelect
            value={lookup}
            onChange={setLookup}
            options={currencyOptions(lookup).filter((o) => o.value !== baseCurrency)}
            aria-label="Moneda a consultar"
          />
        </div>
        <span className="text-ink">
          {current.isFetching
            ? "Consultando…"
            : current.data
              ? `1 ${current.data.base} = ${current.data.rate} ${current.data.target} (desde el ${formatBillingDate(current.data.asOf)})`
              : current.data === null
                ? "No hay tasa registrada."
                : null}
        </span>
      </div>
    </section>
  );
}

/** J. Configuración de Finanzas (solo Administrador). */
export function FinanceSettingsPage() {
  const permissions = useBillingPermissions();
  const { data: settings } = useFinanceSettings({ enabled: permissions.isAdmin });
  if (!permissions.isAdmin) {
    return <FinanceNoPermission description="La configuración de Finanzas es solo para el Administrador." />;
  }
  return (
    <div className="space-y-6">
      <Header level={1} title="Configuración de Finanzas" description="Moneda, cargos automáticos, caja y descuentos." />
      <SettingsForm />
      {settings && <ExchangeRatesSection baseCurrency={settings.baseCurrency} />}
    </div>
  );
}
