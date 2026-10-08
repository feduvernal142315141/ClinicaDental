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
import { useI18n } from "@/lib/contexts/i18n-context";
import type { ChargePolicy } from "@/lib/entity/billing";
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
import { DetailSkeleton } from "../shared/BillingSkeletons";

const POLICIES: ChargePolicy[] = ["SUGGEST", "AUTO", "OFF"];

function chargePolicyLabel(policy: ChargePolicy, t: ReturnType<typeof useI18n>["t"]) {
  switch (policy) {
    case "OFF":
      return {
        label: t("billing.settings.chargePolicy.off"),
        description: t("billing.settings.chargePolicy.offDescription"),
      };
    case "AUTO":
      return {
        label: t("billing.settings.chargePolicy.auto"),
        description: t("billing.settings.chargePolicy.autoDescription"),
      };
    case "SUGGEST":
    default:
      return {
        label: t("billing.settings.chargePolicy.suggest"),
        description: t("billing.settings.chargePolicy.suggestDescription"),
      };
  }
}

function SettingsForm() {
  const { t } = useI18n();
  const { form, submit, settings, loading, loadError, submitting, baseCurrencyLocked } = useFinanceSettingsForm({
    onSaved: () => notify.success(t("billing.settings.saved")),
  });
  const rootError = form.formState.errors.root?.message;

  if (loading) return <DetailSkeleton label={t("billing.settings.loading")} />;
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
              <FormLabel>{t("billing.settings.baseCurrency")}</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value || "__clinic__"}
                  onChange={(value) => field.onChange(value === "__clinic__" ? CLINIC_CURRENCY : value)}
                  options={[
                    { value: "__clinic__", label: t("billing.settings.useClinicCurrency") },
                    ...currencyOptions(settings?.baseCurrency).filter((o) => o.value),
                  ]}
                  disabled={baseCurrencyLocked}
                  aria-label={t("billing.settings.baseCurrency")}
                />
              </FormControl>
              <FormDescription>
                {baseCurrencyLocked ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> {t("billing.settings.currencyLocked")}
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
              <FormLabel>{t("billing.settings.chargePolicy")}</FormLabel>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                  {POLICIES.map((policy) => {
                    const policyText = chargePolicyLabel(policy, t);
                    return (
                      <label
                        key={policy}
                        className="flex cursor-pointer gap-3 rounded-xl border border-hairline p-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
                      >
                        <RadioGroupItem value={policy} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium text-ink">{policyText.label}</span>
                          <span className="block text-xs text-subtle">{policyText.description}</span>
                        </span>
                      </label>
                    );
                  })}
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
                  <FormLabel>{t("billing.settings.allowAdvances")}</FormLabel>
                  <FormDescription>{t("billing.settings.allowAdvancesDescription")}</FormDescription>
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
                  <FormLabel>{t("billing.settings.requireCashSession")}</FormLabel>
                  <FormDescription>{t("billing.settings.requireCashSessionDescription")}</FormDescription>
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
              <FormLabel>{t("billing.settings.maxDiscount")}</FormLabel>
              <FormControl>
                <NumberInput {...field} min={0} max={100} />
              </FormControl>
              <FormDescription>{t("billing.settings.maxDiscountDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {rootError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {rootError} {t("billing.settings.reloadedCurrent")}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("billing.settings.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ExchangeRatesSection({ baseCurrency }: { baseCurrency: string }) {
  const { t } = useI18n();
  const [lookup, setLookup] = useState(COMMON_CURRENCIES.find((c) => c !== baseCurrency) ?? "USD");
  const { form, submit, submitting } = useExchangeRateForm(baseCurrency, {
    onSaved: (saved) => {
      notify.success(t("billing.settings.exchangeSaved"), { description: `1 ${saved.base} = ${saved.rate} ${saved.target}` });
      setLookup(saved.target);
    },
  });
  const current = useExchangeRate(lookup, baseCurrency);
  const rootError = form.formState.errors.root?.message;

  return (
    <section aria-labelledby="exchange-rates" className="bento space-y-5 p-5">
      <div>
        <h2 id="exchange-rates" className="text-base font-semibold text-ink">
          {t("billing.settings.exchangeRates")}
        </h2>
        <p className="text-sm text-subtle">{t("billing.settings.exchangeRatesDescription").replace("{currency}", baseCurrency)}</p>
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
                <FormLabel>{t("billing.settings.currency")}</FormLabel>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={currencyOptions(field.value).filter((o) => o.value !== baseCurrency)}
                    aria-label={t("billing.settings.currency")}
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
                <FormLabel>{t("billing.settings.rate")}</FormLabel>
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
                <FormLabel>{t("billing.date")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} max={localTodayInput()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="sm:mt-[1.6rem]" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("billing.settings.register")}
          </Button>
          {rootError && (
            <Alert variant="destructive" className="sm:col-span-4" role="alert">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4 text-sm">
        <span className="text-subtle">{t("billing.settings.lookupCurrent")}</span>
        <div className="w-32">
          <SearchSelect
            value={lookup}
            onChange={setLookup}
            options={currencyOptions(lookup).filter((o) => o.value !== baseCurrency)}
            aria-label={t("billing.settings.currency")}
          />
        </div>
        <span className="text-ink">
          {current.isFetching
            ? t("billing.settings.checking")
            : current.data
              ? `1 ${current.data.base} = ${current.data.rate} ${current.data.target} (${formatBillingDate(current.data.asOf)})`
              : current.data === null
                ? t("billing.settings.noRate")
                : null}
        </span>
      </div>
    </section>
  );
}

/** J. Configuración de Finanzas (solo Administrador). */
export function FinanceSettingsPage() {
  const permissions = useBillingPermissions();
  const { t } = useI18n();
  const { data: settings } = useFinanceSettings({ enabled: permissions.isAdmin });
  if (!permissions.isAdmin) {
    return <FinanceNoPermission description={t("billing.settings.noPermission")} />;
  }
  return (
    <div className="space-y-6">
      <Header level={1} title={t("billing.settings.title")} description={t("billing.settings.description")} />
      <SettingsForm />
      {settings && <ExchangeRatesSection baseCurrency={settings.baseCurrency} />}
    </div>
  );
}
