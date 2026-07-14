import { normalizeText } from "@/lib/utils/text";
import { currencyFlag, currencyToCountry } from "@/lib/utils/flag";
import { CURRENCY_CATALOG } from "./currencies";

/**
 * Capa derivada (hecha a mano) sobre el catálogo GENERADO de monedas: le
 * añade bandera, país y un `searchText` normalizado para el Select enriquecido.
 * NO regenera ni edita `currencies.ts` (archivo generado) — solo hace join por
 * código. El orden se hereda del catálogo (prioritarias LATAM primero).
 */
export interface CurrencySelectMeta {
  code: string;
  name: string;
  /** Glifo real para las prioritarias LATAM; = code para las exóticas. */
  symbol: string;
  /** Emoji bandera o 🌐 (supranacionales). */
  flag: string;
  /** ISO-3166 alpha-2, o "" cuando no hay país único. */
  countryCode: string;
  /** Normalizado(code + name + symbol + país) — para `matchesQuery`. */
  searchText: string;
}

export const CURRENCY_SELECT_META: readonly CurrencySelectMeta[] =
  CURRENCY_CATALOG.map((e) => {
    const countryCode = currencyToCountry(e.code);
    return {
      code: e.code,
      name: e.name,
      symbol: e.symbol,
      flag: currencyFlag(e.code),
      countryCode,
      searchText: normalizeText(`${e.code} ${e.name} ${e.symbol} ${countryCode}`),
    };
  });

export const CURRENCY_META_BY_CODE: Readonly<Record<string, CurrencySelectMeta>> =
  Object.fromEntries(CURRENCY_SELECT_META.map((m) => [m.code, m]));
