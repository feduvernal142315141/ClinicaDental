import { describe, expect, it } from "vitest";
import { BillingApiError } from "@/lib/services/billing/billing-errors";
import {
  generateIdempotencyKey,
  IDEMPOTENCY_KEY_REUSED_MESSAGE,
  IdempotencyKeyManager,
} from "./use-idempotency-key";

function sequence() {
  let n = 0;
  return () => `key-${++n}`;
}

describe("IdempotencyKeyManager", () => {
  it("genera una clave al abrir el modal", () => {
    const manager = new IdempotencyKeyManager(sequence());
    expect(manager.current()).toBe("key-1");
    expect(manager.reset()).toBe("key-2");
  });

  it("reutiliza la misma clave tras un error de red o de servidor", () => {
    const manager = new IdempotencyKeyManager(sequence());
    expect(manager.handleError(new BillingApiError("network", "Sin conexión"))).toBe("key-1");
    expect(manager.handleError(new BillingApiError("server", "Error", 500))).toBe("key-1");
    expect(manager.handleError(new BillingApiError("bad-request", "El pago supera el saldo", 400))).toBe("key-1");
  });

  it("regenera la clave si el backend dice que ya se usó con otro pago", () => {
    const manager = new IdempotencyKeyManager(sequence());
    const conflict = new BillingApiError("conflict", IDEMPOTENCY_KEY_REUSED_MESSAGE, 409);
    expect(manager.handleError(conflict)).toBe("key-2");
    expect(manager.current()).toBe("key-2");
  });

  it("otros 409 no cambian la clave", () => {
    const manager = new IdempotencyKeyManager(sequence());
    expect(manager.handleError(new BillingApiError("conflict", "Abre la caja antes de cobrar en efectivo.", 409))).toBe(
      "key-1",
    );
  });
});

describe("generateIdempotencyKey", () => {
  it("devuelve UUIDs v4 distintos", () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
