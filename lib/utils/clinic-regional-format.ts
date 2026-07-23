import {
  CURRENCY_LOCALE_BY_CODE,
  CURRENCY_META_BY_CODE,
} from "@/lib/entity/settings";

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

/**
 * Precio exacto: respeta los decimales estándar de la moneda (BOB → 2,
 * COP → 0). Para KPIs agregados usa `formatClinicCurrency` (redondea a 0).
 */
export function formatClinicCurrencyExact(
  value: number | null | undefined,
  currency: string,
): string {
  return new Intl.NumberFormat(resolveCurrencyLocale(currency), {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).format(value ?? 0);
}

/** Símbolo de la moneda ("Bs", "S/", …), o el código si no hay glifo. */
export function getClinicCurrencySymbol(currency: string): string {
  const code = normalizeCurrency(currency);
  return CURRENCY_META_BY_CODE[code]?.symbol ?? code;
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
