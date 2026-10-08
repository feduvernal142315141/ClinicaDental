import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/apiConfig", () => ({ default: { request } }));

import { onLeadModuleDisabled } from "@/lib/services/leads/leads-errors";
import {
  GROWTH_MODULE_DISABLED_MESSAGE,
  hasGrowthErrorCode,
  isGrowthModuleDisabledError,
  toGrowthError,
} from "./growth-errors";
import { growthRequest } from "./growth-http";
import { evaluatePatientSegment, getSegmentFields } from "./growth-segments.service";

const httpError = (status: number, data: unknown) => ({ response: { status, data } });

describe("errores de segmentos y campañas", () => {
  it("conserva el errorCode y el mensaje del backend", () => {
    const error = toGrowthError(
      400,
      { code: "BAD_REQUEST", message: "El campo stage pertenece a la audiencia de prospectos.", errorCode: "SEGMENT_FIELD_NOT_ALLOWED" },
      "Error al guardar",
    );
    expect(error.status).toBe(400);
    expect(error.message).toBe("El campo stage pertenece a la audiencia de prospectos.");
    expect(hasGrowthErrorCode(error, "SEGMENT_FIELD_NOT_ALLOWED")).toBe(true);
  });

  it("un 403 MODULE_NOT_ENABLED es módulo apagado; un 403 sin errorCode es falta de permiso", () => {
    const disabled = toGrowthError(403, { code: "FORBIDDEN", message: "x", errorCode: "MODULE_NOT_ENABLED" }, "f");
    expect(isGrowthModuleDisabledError(disabled)).toBe(true);
    expect(disabled.message).toBe(GROWTH_MODULE_DISABLED_MESSAGE);

    const forbidden = toGrowthError(403, { code: "FORBIDDEN", message: "No tienes permiso para esta acción" }, "f");
    expect(isGrowthModuleDisabledError(forbidden)).toBe(false);
    expect(forbidden.message).toBe("No tienes permiso para esta acción");
  });

  it("no decide por el texto: el mismo mensaje sin errorCode no apaga el módulo", () => {
    const error = toGrowthError(403, { message: GROWTH_MODULE_DISABLED_MESSAGE }, "f");
    expect(isGrowthModuleDisabledError(error)).toBe(false);
  });

  it("sin cuerpo usa el mensaje por defecto de la operación", () => {
    expect(toGrowthError(undefined, undefined, "Error al cargar los segmentos").message).toBe(
      "Error al cargar los segmentos",
    );
  });
});

describe("cliente HTTP de segmentos y campañas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pide el catálogo de la audiencia y no envía clinicId", async () => {
    request.mockResolvedValueOnce({ data: { audience: "LEAD", fields: [] } });
    await getSegmentFields("LEAD");
    const config = request.mock.calls[0][0];
    expect(config.url).toBe("/patient-segments/fields?audience=LEAD");
    expect(JSON.stringify(config)).not.toContain("clinicId");
    expect(config.skipForbiddenHandler).toBe(true);
  });

  it("un 403 MODULE_NOT_ENABLED con la sesión abierta avisa a la app para refrescar capacidades", async () => {
    const listener = vi.fn();
    const unsubscribe = onLeadModuleDisabled(listener);
    request.mockRejectedValueOnce(httpError(403, { code: "FORBIDDEN", message: "x", errorCode: "MODULE_NOT_ENABLED" }));

    await expect(evaluatePatientSegment("segment-1")).rejects.toMatchObject({ errorCode: "MODULE_NOT_ENABLED" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("un 403 de permiso no apaga el módulo", async () => {
    const listener = vi.fn();
    const unsubscribe = onLeadModuleDisabled(listener);
    request.mockRejectedValueOnce(httpError(403, { code: "FORBIDDEN", message: "No tienes permiso para esta acción" }));

    await expect(growthRequest("GET", "/patient-segments", "f")).rejects.toMatchObject({ status: 403 });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
