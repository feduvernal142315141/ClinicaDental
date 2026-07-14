/**
 * Utilidades de bandera emoji. La bandera es SOLO refuerzo visual decorativo
 * (los consumidores la marcan `aria-hidden`); el símbolo/código y el texto
 * llevan todo el significado. En Windows/Chrome el emoji de bandera degrada a
 * un par de letras (p. ej. "CO") — degradación aceptable, sin feature-detect.
 */

/** ISO 3166-1 alpha-2 → emoji bandera "🇨🇴". "" si el código es inválido. */
export function flagEmoji(cc: string): string {
  const code = (cc ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const A = 0x1f1e6; // 🇦 (regional indicator "A")
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65),
  );
}

/**
 * Códigos ISO-4217 cuyas 2 primeras letras NO son el país de la bandera.
 * Los códigos supranacionales/metales que empiezan por "X" (XAF, XOF, XCD,
 * XPF, XDR, XAU…) se cubren sistemáticamente en `currencyToCountry` (no hace
 * falta enumerarlos aquí).
 */
const CURRENCY_COUNTRY_OVERRIDES: Record<string, string> = {
  EUR: "EU", // 🇪🇺 (degrada a "EU"; el símbolo € da el sentido)
  USD: "US", // fijado por claridad
  ANG: "", // florín antillano (país ya inexistente) → globo
};

/** ISO-3166 alpha-2 para la bandera, o "" cuando no hay país único. */
export function currencyToCountry(currencyCode: string): string {
  const code = (currencyCode ?? "").trim().toUpperCase();
  if (code.length < 2) return "";
  if (code in CURRENCY_COUNTRY_OVERRIDES) return CURRENCY_COUNTRY_OVERRIDES[code];
  if (code.startsWith("X")) return ""; // supranacionales / metales preciosos
  return code.slice(0, 2); // COP→CO, MXN→MX, PEN→PE…
}

/** Bandera de la moneda, o globo neutro cuando no hay país único. */
export function currencyFlag(currencyCode: string): string {
  const cc = currencyToCountry(currencyCode);
  return cc ? flagEmoji(cc) : "🌐";
}
