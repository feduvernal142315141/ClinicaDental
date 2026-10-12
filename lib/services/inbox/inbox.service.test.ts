import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  serviceDelete: vi.fn(),
  servicePost: vi.fn(),
  servicePostSilent: vi.fn(),
}));
vi.mock("@/lib/services/baseService", () => ({
  serviceDelete: http.serviceDelete,
  servicePost: http.servicePost,
  serviceGet: vi.fn(),
  serviceGetSilent: vi.fn(),
  servicePostSilent: http.servicePostSilent,
  servicePut: vi.fn(),
}));

import { createInboxSseTicket, deleteConversation, deleteConversations } from "./inbox.service";

beforeEach(() => vi.clearAllMocks());

describe("eliminar conversaciones de la bandeja", () => {
  it("elimina una con DELETE y devuelve lo que el servidor eliminó", async () => {
    http.serviceDelete.mockResolvedValue({ status: 200, data: { deleted: 1, deletedIds: ["conv-1"] } });

    await expect(deleteConversation("conv-1")).resolves.toEqual({ deleted: 1, deletedIds: ["conv-1"] });
    expect(http.serviceDelete).toHaveBeenCalledWith("/whatsapp/inbox/conversations/conv-1");
  });

  it("elimina varias con un solo POST y se queda con `deletedIds`, no con lo pedido", async () => {
    http.servicePost.mockResolvedValue({ status: 200, data: { deleted: 1, deletedIds: ["conv-2"] } });

    await expect(deleteConversations(["conv-1", "conv-2"])).resolves.toEqual({
      deleted: 1,
      deletedIds: ["conv-2"],
    });
    expect(http.servicePost).toHaveBeenCalledWith("/whatsapp/inbox/conversations/delete", {
      ids: ["conv-1", "conv-2"],
    });
  });

  it.each([404, 403, 400])("rechaza con el status %i para que el hook decida qué decir", async (status) => {
    http.servicePost.mockResolvedValue({ status, data: { message: "No se pudo" } });

    await expect(deleteConversations(["conv-1"])).rejects.toMatchObject({ status });
  });

  it("no da por eliminado nada si la respuesta no trae `deletedIds`", async () => {
    http.serviceDelete.mockResolvedValue({ status: 200, data: true });

    await expect(deleteConversation("conv-1")).rejects.toThrow();
  });

  it("rechaza si no hubo respuesta (red caída)", async () => {
    http.serviceDelete.mockResolvedValue(undefined);

    await expect(deleteConversation("conv-1")).rejects.toThrow("Error al eliminar la conversación");
  });
});

describe("ticket del tiempo real", () => {
  it("lee el ticket como lo devuelve el backend: { ticketId }", async () => {
    http.servicePostSilent.mockResolvedValue({ status: 200, data: { ticketId: "ticket-1" } });

    await expect(createInboxSseTicket()).resolves.toBe("ticket-1");
    expect(http.servicePostSilent).toHaveBeenCalledWith("/whatsapp/inbox/events/ticket", {});
  });

  it.each([
    ["{ ticket }", { ticket: "ticket-2" }],
    ["{ data: { ticketId } }", { data: { ticketId: "ticket-3" } }],
  ])("sigue aceptando la forma anterior %s", async (_shape, data) => {
    http.servicePostSilent.mockResolvedValue({ status: 200, data });

    await expect(createInboxSseTicket()).resolves.toMatch(/^ticket-/);
  });

  it("rechaza una respuesta sin ticket en vez de abrir el stream sin él", async () => {
    http.servicePostSilent.mockResolvedValue({ status: 200, data: {} });

    await expect(createInboxSseTicket()).rejects.toThrow();
  });

  it("propaga el 403 para que el cliente deje de reintentar", async () => {
    http.servicePostSilent.mockResolvedValue({ status: 403, data: {} });

    await expect(createInboxSseTicket()).rejects.toMatchObject({ status: 403 });
  });
});
