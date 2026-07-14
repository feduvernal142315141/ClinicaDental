#!/usr/bin/env node
/**
 * generate-currency-catalog.mjs
 * ------------------------------
 * Genera el catálogo completo de monedas ISO-4217 activas usando únicamente
 * las APIs de Intl de Node (sin dependencias externas). Produce un archivo
 * TypeScript determinista con el catálogo, las opciones para el `Select` de
 * moneda, el mapa código→locale (usado para formateo con Intl.NumberFormat)
 * y helpers de validación.
 *
 * Orden del catálogo: primero un conjunto de monedas prioritarias (contexto
 * LATAM/clínica dental), luego el resto ordenado alfabéticamente por nombre
 * en español.
 *
 * Usage: node scripts/generate-currency-catalog.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../lib/entity/settings/currencies.ts");

// ── 1. Orden de prioridad (contexto LATAM dental) ────────────────────────────
const PRIORITY_ORDER = [
  "USD",
  "EUR",
  "BOB",
  "COP",
  "MXN",
  "ARS",
  "PEN",
  "CLP",
  "BRL",
  "UYU",
  "PYG",
  "VES",
  "GTQ",
  "CRC",
  "DOP",
  "HNL",
  "NIO",
  "PAB",
  "GBP",
];

// ── 2. Locale explícito por moneda (para símbolo/formato con Intl.NumberFormat)
//    Debe preservar EXACTAMENTE los locales que ya usaba
//    lib/utils/clinic-regional-format.ts para BOB/COP/EUR/MXN/USD.
const EXPLICIT_LOCALE_BY_CODE = {
  BOB: "es-BO",
  COP: "es-CO",
  EUR: "es-ES",
  MXN: "es-MX",
  USD: "es-US",
  ARS: "es-AR",
  PEN: "es-PE",
  CLP: "es-CL",
  BRL: "pt-BR",
  UYU: "es-UY",
  PYG: "es-PY",
  VES: "es-VE",
  GTQ: "es-GT",
  CRC: "es-CR",
  DOP: "es-DO",
  HNL: "es-HN",
  NIO: "es-NI",
  PAB: "es-PA",
  GBP: "en-GB",
};

const FALLBACK_LOCALE = "es-419";
const DEFAULT_CURRENCY = "USD";

// ── Overrides de nombre en español (PRECEDEN sobre Intl.DisplayNames) ────────
//    Dos usos: (1) códigos que ICU no traduce y devolverían "XXX" en el Select;
//    (2) nombres que ICU sí traduce pero de forma histórica/verbosa/rara para
//    una clínica (p. ej. NIO "Córdoba oro" → "Córdoba"). El valor de este mapa
//    SIEMPRE gana. Auditados a mano (revisión de los 162 nombres).
const NAME_OVERRIDES = {
  // Must-fix (revisión de los 162 nombres):
  NIO: "Córdoba", // "oro" es calificador histórico (reforma 1990); hoy solo "córdoba"
  SLL: "Leona sierraleonesa (antigua)", // defunct + evita duplicar con SLE; no un rango de años crudo
  XSU: "Sucre (ALBA)", // el paréntesis distingue del sucre ecuatoriano; no dejar "Sucre" pelado
  // Concisión (nombres CLDR correctos pero muy largos para un dropdown):
  AED: "Dírham emiratí",
  BAM: "Marco convertible bosnio",
  CNY: "Yuan chino",
};

function localeForCode(code) {
  return EXPLICIT_LOCALE_BY_CODE[code] ?? FALLBACK_LOCALE;
}

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── 3. Construir una entrada del catálogo para un código ISO-4217 ───────────
const displayNames = new Intl.DisplayNames(["es"], { type: "currency" });

function buildEntry(code) {
  const locale = localeForCode(code);

  let rawName;
  try {
    rawName = displayNames.of(code);
  } catch {
    rawName = code;
  }
  // El override en español SIEMPRE gana (nombres históricos/verbosos de ICU y
  // códigos que ICU no traduce). Si no hay override, se usa el nombre de Intl
  // capitalizado; y si Intl tampoco reconoce el código (`of` devuelve el mismo
  // código), el propio código como último recurso.
  const name =
    NAME_OVERRIDES[code] ??
    (rawName && rawName !== code ? capitalizeFirst(rawName) : code);

  let symbol = code;
  let decimalDigits = 2;
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    });
    decimalDigits = formatter.resolvedOptions().maximumFractionDigits;
    const parts = formatter.formatToParts(0);
    const currencyPart = parts.find((p) => p.type === "currency");
    if (currencyPart?.value) {
      symbol = currencyPart.value;
    }
  } catch {
    // Mantiene los valores por defecto (symbol = code, decimalDigits = 2).
  }

  return { code, name, locale, symbol, decimalDigits };
}

// ── 4. Recolectar y ordenar todas las monedas activas ────────────────────────
const allCodes = Intl.supportedValuesOf("currency");
const codeSet = new Set(allCodes);

const priorityCodes = PRIORITY_ORDER.filter((code) => codeSet.has(code));
const priorityCodeSet = new Set(priorityCodes);
const restCodes = allCodes
  .filter((code) => !priorityCodeSet.has(code))
  .sort((a, b) => {
    const nameA = buildEntry(a).name;
    const nameB = buildEntry(b).name;
    return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
  });

const orderedCodes = [...priorityCodes, ...restCodes];
const catalog = orderedCodes.map(buildEntry);

// ── 5. Emitir el archivo TypeScript ──────────────────────────────────────────
function tsStringLiteral(value) {
  return JSON.stringify(value);
}

const catalogEntriesTs = catalog
  .map(
    (entry) =>
      `  { code: ${tsStringLiteral(entry.code)}, name: ${tsStringLiteral(
        entry.name,
      )}, locale: ${tsStringLiteral(entry.locale)}, symbol: ${tsStringLiteral(
        entry.symbol,
      )}, decimalDigits: ${entry.decimalDigits} },`,
  )
  .join("\n");

const ts = `// GENERATED by scripts/generate-currency-catalog.mjs — DO NOT EDIT BY HAND
// Re-run the script to regenerate.
//
// Catálogo completo de monedas ISO-4217 activas (Intl.supportedValuesOf),
// con nombre en español (Intl.DisplayNames), locale de formateo, símbolo y
// dígitos decimales (Intl.NumberFormat). Orden: prioritarias (contexto LATAM
// dental) primero, luego el resto alfabético por nombre en español.

/** Entrada del catálogo de monedas. */
export interface CurrencyCatalogEntry {
  /** Código ISO-4217 (ej. "USD"). */
  code: string;
  /** Nombre en español, con mayúscula inicial (ej. "Dólar estadounidense"). */
  name: string;
  /** Locale usado para formatear esta moneda con Intl.NumberFormat. */
  locale: string;
  /** Símbolo de la moneda (o el código si Intl no provee símbolo). */
  symbol: string;
  /** Dígitos decimales estándar de la moneda (maximumFractionDigits). */
  decimalDigits: number;
}

/** Catálogo completo de monedas ISO-4217 activas (\`${catalog.length}\` entradas). */
export const CURRENCY_CATALOG: readonly CurrencyCatalogEntry[] = [
${catalogEntriesTs}
];

/** Opciones para el control \`Select\` de moneda. Label: "CODE - Nombre". */
export const CURRENCY_OPTIONS: readonly { value: string; label: string }[] =
  CURRENCY_CATALOG.map((entry) => ({
    value: entry.code,
    label: \`\${entry.code} - \${entry.name}\`,
  }));

/** Mapa código→locale, usado para formateo con Intl.NumberFormat. */
export const CURRENCY_LOCALE_BY_CODE: Readonly<Record<string, string>> =
  Object.fromEntries(CURRENCY_CATALOG.map((entry) => [entry.code, entry.locale]));

/** Set de códigos ISO-4217 soportados por el catálogo. */
export const CURRENCY_CODES: ReadonlySet<string> = new Set(
  CURRENCY_CATALOG.map((entry) => entry.code),
);

/** Moneda por defecto de la clínica. */
export const DEFAULT_CURRENCY = ${tsStringLiteral(DEFAULT_CURRENCY)};

/** Indica si \`code\` es una moneda ISO-4217 soportada por el catálogo. */
export function isSupportedCurrency(code: string): boolean {
  return CURRENCY_CODES.has(code?.trim().toUpperCase());
}
`;

writeFileSync(OUT_PATH, ts, "utf-8");
console.log(`\n✅ Generated: ${OUT_PATH}`);
console.log(`   Currencies: ${catalog.length}`);
console.log(`   Priority: ${priorityCodes.length} / ${PRIORITY_ORDER.length} requested`);
