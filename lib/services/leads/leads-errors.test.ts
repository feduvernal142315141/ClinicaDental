import { afterEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/apiConfig", () => ({ default: { request: apiRequest } }));

import { hasLeadErrorCode, isLeadModuleDisabledError, onLeadModuleDisabled, toLeadError } from "./leads-errors";
import { leadRequest } from "./leads-http";
import { leadsService } from "./leads.service";

const body = (errorCode: string | undefined, message = "Mensaje del backend", code = "FORBIDDEN") => ({
  code,
  message,
  status: 403,
  timestamp: "2026-10-07T12:00:00Z",
  path: "/leads",
  ...(errorCode ? { errorCode } : {}),
});

describe("toLeadError: decide por errorCode, no por el texto", () => {
  it("403 MODULE_NOT_ENABLED es 'module-disabled' con el texto del producto", () => {
    const error = toLeadError(403, body("MODULE_NOT_ENABLED", "cualquier texto"));
    expect(error.kind).toBe("module-disabled");
    expect(error.message).toBe("Tu clínica no tiene habilitado este módulo");
    expect(isLeadModuleDisabledError(error)).toBe(true);
  });

  it("403 sin errorCode es falta de permiso y conserva el mensaje", () => {
    const error = toLeadError(403, body(undefined, "No tienes permisos para realizar esta acción."));
    expect(error.kind).toBe("forbidden");
    expect(error.message).toBe("No tienes permisos para realizar esta acción.");
    expect(isLeadModuleDisabledError(error)).toBe(false);
  });

  it("un texto parecido sin el errorCode NO apaga el módulo", () => {
    expect(toLeadError(403, body(undefined, "Tu clínica no tiene habilitado este módulo")).kind).toBe("forbidden");
  });

  it("conserva el errorCode de negocio de los 409/404/400", () => {
    expect(hasLeadErrorCode(toLeadError(409, body("LEAD_DUPLICATE_OPEN", "Ya existe", "CONFLICT")), "LEAD_DUPLICATE_OPEN")).toBe(true);
    expect(hasLeadErrorCode(toLeadError(409, body("LEAD_VERSION_CONFLICT")), "LEAD_VERSION_CONFLICT")).toBe(true);
    expect(toLeadError(404, body("LEAD_NOT_FOUND"))).toMatchObject({ kind: "not-found", errorCode: "LEAD_NOT_FOUND" });
    expect(toLeadError(400, body("LEAD_INVALID", "El teléfono no es válido"))).toMatchObject({
      kind: "bad-request",
      message: "El teléfono no es válido",
    });
    expect(toLeadError(undefined, undefined).kind).toBe("network");
    expect(toLeadError(500, {}).kind).toBe("server");
  });
});

describe("leadRequest", () => {
  afterEach(() => apiRequest.mockReset());

  it("gestiona sus propios 403 y avisa cuando el módulo está apagado", async () => {
    const listener = vi.fn();
    const off = onLeadModuleDisabled(listener);
    apiRequest.mockRejectedValueOnce({ response: { status: 403, data: body("MODULE_NOT_ENABLED") } });
    await expect(leadRequest("GET", "/leads")).rejects.toMatchObject({ kind: "module-disabled" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(apiRequest.mock.calls[0][0]).toMatchObject({ skipForbiddenHandler: true });

    apiRequest.mockRejectedValueOnce({ response: { status: 403, data: body(undefined) } });
    await expect(leadRequest("GET", "/leads")).rejects.toMatchObject({ kind: "forbidden" });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it("la lista pagina desde 0, acota pageSize y no envía filtros vacíos ni clinicId", async () => {
    apiRequest.mockResolvedValueOnce({ data: { entities: [], pagination: { page: 0, pageSize: 100, total: 0 } } });
    await leadsService.list({ q: "  ana ", stage: "NEW", unassigned: false, overdueFollowUp: true, pageSize: 500 });
    const { params, url, method } = apiRequest.mock.calls[0][0];
    expect({ url, method }).toEqual({ url: "/leads", method: "GET" });
    expect(params).toEqual({ q: "ana", stage: "NEW", overdueFollowUp: true, page: 0, pageSize: 100 });
    expect(params).not.toHaveProperty("clinicId");
  });

  it("el pipeline no envía `stage`", async () => {
    apiRequest.mockResolvedValueOnce({ data: { stages: [] } });
    await leadsService.pipeline({ stage: "NEW", source: "WHATSAPP" });
    expect(apiRequest.mock.calls[0][0]).toMatchObject({ url: "/leads/pipeline", params: { source: "WHATSAPP" } });
    expect(apiRequest.mock.calls[0][0].params).not.toHaveProperty("stage");
  });

  it("reservar y convertir son UNA llamada a /book o /convert", async () => {
    apiRequest.mockResolvedValue({ data: {} });
    await leadsService.book("lead-1", { doctorId: "d1", date: "2026-10-12", time: "10:00" });
    await leadsService.convert("lead-1");
    await leadsService.assign("lead-1", null);
    expect(apiRequest.mock.calls.map(([config]) => `${config.method} ${config.url}`)).toEqual([
      "POST /leads/lead-1/book",
      "POST /leads/lead-1/convert",
      "POST /leads/lead-1/assign",
    ]);
    expect(apiRequest.mock.calls[2][0].data).toEqual({ userId: null });
  });
});
