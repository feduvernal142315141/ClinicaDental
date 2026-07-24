import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";

/**
 * Helpers monetarios del módulo de facturación.
 *
 * - Los montos de documento se congelan con su currency + exchangeRate.
 * - `exchangeRate` = documentoCurrency / clinicBaseCurrency (1 = misma moneda).
 * - Redondeo a 2 decimales consistente en UI; el backend es la fuente de verdad.
 */

/** Redondea a 2 decimales (centavos). */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Convierte un monto entre monedas usando tasas relativas a una base común.
 * Si ambas tasas son respecto a la misma base: amount * (toRate / fromRate).
 *
 * Ejemplo: documento en USD (rate 1), pago en NIO (rate 36.5):
 * convertAmount(100, 1, 36.5) → 3650 NIO
 */
export function convertAmount(
  amount: number,
  fromRate: number,
  toRate: number,
): number {
  if (!Number.isFinite(amount)) return 0;
  const from = fromRate > 0 ? fromRate : 1;
  const to = toRate > 0 ? toRate : 1;
  if (from === to) return roundMoney(amount);
  return roundMoney((amount * to) / from);
}

/** Formatea un monto con la moneda del documento. */
export function formatMoney(
  amount: number | null | undefined,
  currency: string,
): string {
  return formatClinicCurrencyExact(amount, currency);
}

/** Calcula total de una línea: qty * unitPrice - discount. */
export function calcLineTotal(
  quantity: number,
  unitPrice: number,
  discount = 0,
): number {
  return roundMoney(Math.max(0, quantity * unitPrice - discount));
}

/** Subtotal de items (suma de totales de línea). */
export function calcSubtotal(
  items: Array<{ quantity: number; unitPrice: number; discount?: number }>,
): number {
  return roundMoney(
    items.reduce(
      (sum, item) =>
        sum + calcLineTotal(item.quantity, item.unitPrice, item.discount ?? 0),
      0,
    ),
  );
}

/** Total del documento = subtotal - descuento global. */
export function calcDocumentTotal(subtotal: number, discount = 0): number {
  return roundMoney(Math.max(0, subtotal - discount));
}
