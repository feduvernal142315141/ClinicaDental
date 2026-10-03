import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FINANCE_MODULE_DISABLED_MESSAGE,
  FORBIDDEN_FALLBACK_MESSAGE,
  isModuleDisabledError,
  toBillingError,
} from "./billing-errors";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/apiConfig", () => ({ default: { request: apiRequest } }));

import { onFinanceModuleDisabled } from "./billing-errors";
import { billingRequest } from "./billing-http";

const body = (message: string, code = "FORBIDDEN") => ({
  code,
  message,
  status: 403,
  timestamp: "2026-10-01T12:00:00Z",
  path: "/billing/invoices",
});

describe("toBillingError: 403 de módulo apagado ≠ 403 de permiso", () => {
  it("el mensaje exacto del módulo apagado es 'module-disabled'", () => {
    const error = toBillingError(403, body(FINANCE_MODULE_DISABLED_MESSAGE));
    expect(error.kind).toBe("module-disabled");
    expect(isModuleDisabledError(error)).toBe(true);
  });

  it("cualquier otro 403 es falta de permiso y conserva el mensaje del backend", () => {
    const error = toBillingError(403, body("No tienes permisos para realizar esta acción."));
    expect(error.kind).toBe("forbidden");
    expect(error.message).toBe("No tienes permisos para realizar esta acción.");
    expect(isModuleDisabledError(error)).toBe(false);
  });

  it("un 403 sin mensaje usa el texto de permiso", () => {
    expect(toBillingError(403, {}).message).toBe(FORBIDDEN_FALLBACK_MESSAGE);
  });

  it("un texto parecido pero no exacto NO apaga el módulo", () => {
    expect(toBillingError(403, body("El módulo de Finanzas no está habilitado")).kind).toBe("forbidden");
  });

  it("clasifica el resto de estados y muestra el message tal cual", () => {
    expect(toBillingError(409, body("Ya hay una caja abierta.", "CONFLICT"))).toMatchObject({
      kind: "conflict",
      message: "Ya hay una caja abierta.",
    });
    expect(toBillingError(422, body("La cantidad debe ser mayor a 0.", "VALIDATION")).kind).toBe("validation");
    expect(toBillingError(400, body("El rango de fechas no es válido.", "BAD_REQUEST")).kind).toBe("bad-request");
    expect(toBillingError(404, body("El recibo no existe.", "NOT_FOUND")).kind).toBe("not-found");
    expect(toBillingError(undefined, undefined).kind).toBe("network");
    expect(toBillingError(500, {}).kind).toBe("server");
  });
});

describe("billingRequest", () => {
  afterEach(() => apiRequest.mockReset());

  it("pide al interceptor global que no muestre su alerta de 403", async () => {
    apiRequest.mockResolvedValue({ data: { ok: true }, status: 200 });
    await billingRequest("GET", "/billing/settings");
    expect(apiRequest).toHaveBeenCalledWith(expect.objectContaining({ skipForbiddenHandler: true }));
  });

  it("ante el 403 de módulo apagado notifica a la app y lanza module-disabled", async () => {
    apiRequest.mockRejectedValue({ response: { status: 403, data: body(FINANCE_MODULE_DISABLED_MESSAGE) } });
    const listener = vi.fn();
    const unsubscribe = onFinanceModuleDisabled(listener);
    await expect(billingRequest("GET", "/billing/invoices")).rejects.toMatchObject({ kind: "module-disabled" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("ante un 403 de permiso NO notifica el apagado del módulo", async () => {
    apiRequest.mockRejectedValue({ response: { status: 403, data: body("No tienes permisos para realizar esta acción.") } });
    const listener = vi.fn();
    const unsubscribe = onFinanceModuleDisabled(listener);
    await expect(billingRequest("POST", "/billing/payments")).rejects.toMatchObject({ kind: "forbidden" });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("envía la Idempotency-Key y distingue 201 (nuevo) de 200 (reintento)", async () => {
    // El pago de prueba es mínimo a propósito: se silencia el aviso de contrato de desarrollo.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { billingApi } = await import("./billing.api");
    const payment = { id: "pay-1" };
    apiRequest.mockResolvedValueOnce({ data: payment, status: 201 });
    apiRequest.mockResolvedValueOnce({ data: payment, status: 200 });
    const request = { patientId: "p1", amount: 10, currency: "NIO", method: "CASH" as const };

    await expect(billingApi.registerPayment(request, "key-1")).resolves.toMatchObject({ replayed: false });
    await expect(billingApi.registerPayment(request, "key-1")).resolves.toMatchObject({ replayed: true });
    expect(apiRequest.mock.calls[0][0].headers).toMatchObject({ "Idempotency-Key": "key-1" });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("convierte el 404 de caja actual en 'no hay caja abierta'", async () => {
    const { billingApi } = await import("./billing.api");
    apiRequest.mockRejectedValue({ response: { status: 404, data: body("La caja abierta no existe.", "NOT_FOUND") } });
    await expect(billingApi.getCurrentCashSession()).resolves.toBeNull();
  });
});
