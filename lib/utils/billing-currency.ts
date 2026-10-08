import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";

/**
 * Helpers monetarios de Finanzas. Replican `FinanceMoney` del backend:
 *
 * - Redondeo HALF_UP a 2 decimales (alejándose de cero en el .5, como `BigDecimal`).
 * - Total de línea = round(cantidad × precio) − descuento de la línea.
 * - Documento = suma de líneas − descuento global.
 * - Tasa = unidades de esa moneda por 1 de la base (la base vale 1).
 *
 * Son vistas previas: el backend es la fuente de verdad y la UI siempre pinta lo que devuelve.
 */

/** Redondea a `decimals` decimales con HALF_UP, sin el ruido de los floats (1.005 → 1.01). */
export function roundHalfUp(amount: number, decimals = 2): number {
  if (!Number.isFinite(amount)) return 0;
  const factor = 10 ** decimals;
  // toPrecision(15) elimina el error binario (1.005 * 100 = 100.49999999999999).
  const scaled = Number((Math.abs(amount) * factor).toPrecision(15));
  const rounded = Math.round(scaled) / factor;
  return amount < 0 ? -rounded : rounded;
}

/** Redondea a 2 decimales (centavos), HALF_UP. */
export function roundMoney(amount: number): number {
  return roundHalfUp(amount, 2);
}

/**
 * Convierte un monto de la moneda A a la B: `monto × tasaB / tasaA`.
 * Las tasas son unidades de cada moneda por 1 de la moneda base.
 *
 * Ejemplo con base NIO: 100 USD (tasa 0.0273) → NIO (tasa 1) = 100 × 1 / 0.0273 ≈ 3663.00
 */
export function convertAmount(amount: number, fromRate: number, toRate: number): number {
  if (!Number.isFinite(amount)) return 0;
  const from = fromRate > 0 ? fromRate : 1;
  const to = toRate > 0 ? toRate : 1;
  if (from === to) return roundMoney(amount);
  return roundMoney((amount * to) / from);
}

/** Formatea un monto con la moneda indicada. */
export function formatMoney(amount: number | null | undefined, currency: string): string {
  return formatClinicCurrencyExact(amount, currency);
}

/** Importe bruto de una línea: round(cantidad × precio). */
export function calcLineGross(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

/** Total de una línea: round(cantidad × precio) − descuento. Nunca negativo. */
export function calcLineTotal(quantity: number, unitPrice: number, discount = 0): number {
  return roundMoney(Math.max(0, calcLineGross(quantity, unitPrice) - discount));
}

/** Subtotal = suma de los totales de línea. */
export function calcSubtotal(
  items: Array<{ quantity: number; unitPrice: number; discount?: number }>,
): number {
  return roundMoney(
    items.reduce((sum, item) => sum + calcLineTotal(item.quantity, item.unitPrice, item.discount ?? 0), 0),
  );
}

/** Total del documento = subtotal − descuento global. Nunca negativo. */
export function calcDocumentTotal(subtotal: number, discount = 0): number {
  return roundMoney(Math.max(0, subtotal - discount));
}

/** Descuento total (líneas + global) como porcentaje del bruto. */
export function discountPercentOfGross(
  items: Array<{ quantity: number; unitPrice: number; discount?: number }>,
  globalDiscount = 0,
): number {
  const gross = items.reduce((sum, item) => sum + calcLineGross(item.quantity, item.unitPrice), 0);
  if (gross <= 0) return 0;
  const discount = items.reduce((sum, item) => sum + (item.discount ?? 0), 0) + globalDiscount;
  return roundHalfUp((discount / gross) * 100, 2);
}
