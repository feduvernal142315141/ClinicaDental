import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ servicePost: vi.fn(), serviceGet: vi.fn(), serviceDelete: vi.fn() }));
vi.mock("@/lib/services/baseService", () => http);

import { clinicTemplateService } from "./clinic-template.service";
import { isTemplateBeyondUse, templateUnusableReason } from "@/lib/entity/settings";

beforeEach(() => vi.clearAllMocks());

describe("sincronizar con Meta", () => {
  it("devuelve cuántas plantillas quedaron fuera de la cuenta actual", async () => {
    http.servicePost.mockResolvedValue({
      status: 200,
      data: { imported: 1, updated: 2, total: 5, message: "ok", unavailable: 3 },
    });

    await expect(clinicTemplateService.syncMetaTemplates()).resolves.toMatchObject({
      imported: 1,
      updated: 2,
      unavailable: 3,
    });
    expect(http.servicePost).toHaveBeenCalledWith("/clinic-template/sync-meta", {});
  });
});

describe("republicar en la cuenta actual", () => {
  it("llama a republish-meta sin cuerpo y devuelve los cuatro grupos", async () => {
    http.servicePost.mockResolvedValue({
      status: 200,
      data: {
        republished: 2,
        alreadyInAccount: 1,
        skipped: [{ id: "t1", name: "promo_importada", reason: "CREATED_OUTSIDE_PANEL" }],
        failed: [{ id: "t2", name: "recordatorio", reason: "META_REJECTED" }],
      },
    });

    await expect(clinicTemplateService.republishMetaTemplates()).resolves.toEqual({
      republished: 2,
      alreadyInAccount: 1,
      skipped: [{ id: "t1", name: "promo_importada", reason: "CREATED_OUTSIDE_PANEL" }],
      failed: [{ id: "t2", name: "recordatorio", reason: "META_REJECTED" }],
    });
    expect(http.servicePost).toHaveBeenCalledWith("/clinic-template/republish-meta", {});
  });

  it("tolera una respuesta sin listas ni contadores", async () => {
    http.servicePost.mockResolvedValue({ status: 200, data: { republished: 1 } });

    await expect(clinicTemplateService.republishMetaTemplates()).resolves.toEqual({
      republished: 1,
      alreadyInAccount: 0,
      skipped: [],
      failed: [],
    });
  });

  it("rechaza con el mensaje del backend cuando no hay cuenta de WhatsApp o Meta no responde", async () => {
    http.servicePost.mockResolvedValue({
      status: 400,
      data: { message: "La clínica no tiene una cuenta de WhatsApp conectada" },
    });

    await expect(clinicTemplateService.republishMetaTemplates()).rejects.toThrow(
      "La clínica no tiene una cuenta de WhatsApp conectada",
    );
  });
});

describe("plantillas que no se pueden elegir", () => {
  it("solo se muestran deshabilitadas las pendientes y las que no están en la cuenta", () => {
    expect(templateUnusableReason({ metaTemplateStatus: "NOT_IN_ACCOUNT" })).toBe("NOT_IN_ACCOUNT");
    expect(templateUnusableReason({ metaTemplateStatus: "PENDING" })).toBe("PENDING");
    expect(templateUnusableReason({ metaTemplateStatus: "APPROVED" })).toBeNull();
    expect(templateUnusableReason({ metaTemplateStatus: "REJECTED" })).toBeNull();
    expect(templateUnusableReason({})).toBeNull();
  });
});

describe("eliminar plantillas", () => {
  it("elimina una con DELETE y devuelve lo que salió de verdad", async () => {
    http.serviceDelete.mockResolvedValue({
      status: 200,
      data: { deleted: 1, deletedIds: ["t1"], blocked: [], failed: [] },
    });

    await expect(clinicTemplateService.deleteClinicTemplate("t1")).resolves.toEqual({
      deleted: 1,
      deletedIds: ["t1"],
      blocked: [],
      failed: [],
    });
    expect(http.serviceDelete).toHaveBeenCalledWith("/clinic-template/t1");
  });

  it("un 200 con la única plantilla bloqueada no es una eliminación", async () => {
    http.serviceDelete.mockResolvedValue({
      status: 200,
      data: {
        deleted: 0,
        deletedIds: [],
        blocked: [{ id: "t1", name: "recordatorio_24h", reason: "IN_USE_BY_REMINDER" }],
        failed: [],
      },
    });

    await expect(clinicTemplateService.deleteClinicTemplate("t1")).resolves.toEqual({
      deleted: 0,
      deletedIds: [],
      blocked: [{ id: "t1", name: "recordatorio_24h", reason: "IN_USE_BY_REMINDER" }],
      failed: [],
    });
  });

  it("elimina varias con un solo POST y separa eliminadas, bloqueadas y fallidas", async () => {
    http.servicePost.mockResolvedValue({
      status: 200,
      data: {
        deleted: 1,
        deletedIds: ["t1"],
        blocked: [{ id: "t2", name: "promo", reason: "IN_USE_BY_CAMPAIGN" }],
        failed: [{ id: "t3", name: "aviso", reason: "META_DELETE_FAILED" }],
      },
    });

    const result = await clinicTemplateService.deleteClinicTemplates(["t1", "t2", "t3"]);

    expect(http.servicePost).toHaveBeenCalledWith("/clinic-template/delete", { ids: ["t1", "t2", "t3"] });
    expect(result.deletedIds).toEqual(["t1"]);
    expect(result.blocked).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });

  it.each([404, 403])("rechaza con el status %i para que el hook decida qué decir", async (status) => {
    http.servicePost.mockResolvedValue({ status, data: {} });

    await expect(clinicTemplateService.deleteClinicTemplates(["t1"])).rejects.toMatchObject({ status });
  });

  it("rechaza con el mensaje del backend si no se pudo consultar Meta", async () => {
    http.serviceDelete.mockResolvedValue({ status: 502, data: { message: "No se pudo consultar Meta" } });

    await expect(clinicTemplateService.deleteClinicTemplate("t1")).rejects.toThrow("No se pudo consultar Meta");
  });

  it("no da nada por eliminado si la respuesta no trae `deletedIds`", async () => {
    http.serviceDelete.mockResolvedValue({ status: 200, data: true });

    await expect(clinicTemplateService.deleteClinicTemplate("t1")).rejects.toThrow();
  });
});

describe("plantillas no utilizables", () => {
  it("son las rechazadas y las que no están en la cuenta actual", () => {
    expect(isTemplateBeyondUse({ metaTemplateStatus: "REJECTED" })).toBe(true);
    expect(isTemplateBeyondUse({ metaTemplateStatus: "NOT_IN_ACCOUNT" })).toBe(true);
    expect(isTemplateBeyondUse({ metaTemplateStatus: "PENDING" })).toBe(false);
    expect(isTemplateBeyondUse({ metaTemplateStatus: "APPROVED" })).toBe(false);
    expect(isTemplateBeyondUse({})).toBe(false);
  });
});
