import { describe, expect, it } from "vitest";
import {
  calcDocumentTotal,
  calcLineTotal,
  calcSubtotal,
  convertAmount,
  discountPercentOfGross,
  roundHalfUp,
  roundMoney,
} from "./billing-currency";

describe("roundMoney (HALF_UP como BigDecimal)", () => {
  it("redondea el .5 hacia arriba aunque el float lo represente por debajo", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(1.0049)).toBe(1);
  });

  it("aleja de cero en negativos (HALF_UP, no HALF_EVEN)", () => {
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(0.125)).toBe(0.13);
  });

  it("devuelve 0 para valores no finitos", () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("admite más decimales para tasas", () => {
    expect(roundHalfUp(36.624349999, 8)).toBe(36.62435);
  });
});

describe("totales de línea y documento", () => {
  it("total de línea = round(cantidad × precio) − descuento", () => {
    // 3 × 33.335 = 100.005 → 100.01 (HALF_UP) − 0.01 = 100.00
    expect(calcLineTotal(3, 33.335, 0.01)).toBe(100);
    expect(calcLineTotal(1, 1200)).toBe(1200);
  });

  it("redondea por línea antes de sumar", () => {
    const items = [
      { quantity: 1, unitPrice: 0.005 },
      { quantity: 1, unitPrice: 0.005 },
    ];
    // Cada línea redondea a 0.01 → 0.02 (sumar floats daría 0.01).
    expect(calcSubtotal(items)).toBe(0.02);
  });

  it("documento = subtotal − descuento global, nunca negativo", () => {
    expect(calcDocumentTotal(1500, 200)).toBe(1300);
    expect(calcDocumentTotal(100, 150)).toBe(0);
  });

  it("calcula el % de descuento sobre el bruto", () => {
    const items = [{ quantity: 2, unitPrice: 500, discount: 100 }];
    expect(discountPercentOfGross(items, 100)).toBe(20);
  });
});

describe("convertAmount (A→B = monto × tasaB / tasaA)", () => {
  it("convierte usando tasas contra la base", () => {
    // Base NIO (1). USD vale 0.0273 por 1 NIO.
    expect(convertAmount(100, 0.0273, 1)).toBe(3663);
    expect(convertAmount(3663, 1, 0.0273)).toBe(100);
  });

  it("no altera montos en la misma moneda", () => {
    expect(convertAmount(10.005, 1, 1)).toBe(10.01);
  });

  it("trata tasas inválidas como 1", () => {
    expect(convertAmount(50, 0, -2)).toBe(50);
  });
});
