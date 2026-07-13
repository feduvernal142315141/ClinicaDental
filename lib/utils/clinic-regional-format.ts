import { CURRENCY_LOCALE_BY_CODE } from "@/lib/entity/settings";

export function formatClinicCurrency(
  value: number | null | undefined,
  currency: string,
): string {
  return new Intl.NumberFormat(resolveCurrencyLocale(currency), {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatClinicCurrencyShort(
  value: number | null | undefined,
  currency: string,
): string {
  return new Intl.NumberFormat(resolveCurrencyLocale(currency), {
    style: "currency",
    currency: normalizeCurrency(currency),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatClinicTimezone(timezone: string): string {
  return timezone.replace(/_/g, " ");
}

function resolveCurrencyLocale(currency: string): string {
  return CURRENCY_LOCALE_BY_CODE[normalizeCurrency(currency)] ?? "es-419";
}

function normalizeCurrency(currency: string): string {
  return currency?.trim().toUpperCase() || "USD";
}
