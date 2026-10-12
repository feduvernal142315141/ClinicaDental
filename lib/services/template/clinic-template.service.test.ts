import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ servicePost: vi.fn(), serviceGet: vi.fn() }));
vi.mock("@/lib/services/baseService", () => http);

import { clinicTemplateService } from "./clinic-template.service";
import { templateUnusableReason } from "@/lib/entity/settings";

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
