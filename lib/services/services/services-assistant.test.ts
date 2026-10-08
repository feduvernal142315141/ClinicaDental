import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ serviceGet: vi.fn(), servicePost: vi.fn(), servicePut: vi.fn(), servicePatch: vi.fn() }));
vi.mock("../baseService", () => http);

import { servicesService } from "./services.service";

describe("perfil del asistente: contrato HTTP", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda con PUT /services/{id}/assistant-profile enviando solo los dos campos", async () => {
    http.servicePut.mockResolvedValue({ status: 200, data: true });
    const saved = await servicesService.setAssistantProfile("service-1", {
      assistantVisible: true,
      assistantDescription: "Aclara el tono de los dientes",
    });
    expect(saved).toBe(true);
    expect(http.servicePut).toHaveBeenCalledWith("/services/service-1/assistant-profile", {
      assistantVisible: true,
      assistantDescription: "Aclara el tono de los dientes",
    });
  });

  it("propaga el mensaje y el status del backend", async () => {
    http.servicePut.mockResolvedValue({
      status: 400,
      data: { message: "Solo los tratamientos y procedimientos pueden mostrarse al asistente; los productos y anticipos no." },
    });
    await expect(
      servicesService.setAssistantProfile("service-2", { assistantVisible: true, assistantDescription: null }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Solo los tratamientos y procedimientos pueden mostrarse al asistente; los productos y anticipos no.",
    });
  });

  it("crear y editar el servicio no envían los campos del asistente", async () => {
    http.servicePost.mockResolvedValue({ status: 201, data: "service-9" });
    http.servicePut.mockResolvedValue({ status: 200, data: true });
    const payload = { code: "BLQ", name: "Blanqueamiento", type: "TREATMENT" as const, cost: 250, odontogramEnabled: false, odontogramSymbolMode: "NONE" as const };
    await servicesService.createService(payload);
    await servicesService.updateService("service-9", payload);
    for (const body of [http.servicePost.mock.calls[0][1], http.servicePut.mock.calls[0][1]]) {
      expect(body).not.toHaveProperty("assistantVisible");
      expect(body).not.toHaveProperty("assistantDescription");
      expect(body).not.toHaveProperty("clinicId");
    }
  });

  it("pregunta por un solo servicio visible para el aviso de primera vez", async () => {
    http.serviceGet.mockResolvedValue({ status: 200, data: { entities: [], pagination: { page: 0, pageSize: 1, total: 0 } } });
    expect(await servicesService.hasAssistantVisibleServices()).toBe(false);
    const url = decodeURIComponent(http.serviceGet.mock.calls[0][0] as string);
    expect(url).toContain("pageSize=1");
    expect(url).toContain("assistantVisible");
    http.serviceGet.mockResolvedValue({ status: 200, data: { entities: [{}], pagination: { page: 0, pageSize: 1, total: 3 } } });
    expect(await servicesService.hasAssistantVisibleServices()).toBe(true);
  });
});
