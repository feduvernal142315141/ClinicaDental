import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const api = vi.hoisted(() => ({ deleteConversation: vi.fn(), deleteConversations: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/services/inbox/inbox.service", () => api);
vi.mock("@/lib/utils/notify", () => ({ notify: toast }));
vi.mock("@/lib/contexts/i18n-context", () => {
  const t = (key: string) => key;
  return { useI18n: () => ({ t }) };
});
vi.mock("@/lib/contexts/assistant-name-context", () => ({
  useAssistantText: () => ({ assistantName: "Dalia", withAssistant: (text: string) => text }),
}));

import { useDeleteConversations } from "./use-inbox-actions";

const refused = (status: number) => Object.assign(new Error("rechazado"), { status });

function setup() {
  const onDeleted = vi.fn();
  const onMissing = vi.fn();
  const { result } = renderHook(() => useDeleteConversations({ onDeleted, onMissing }));
  const run = (ids: string[]) => act(() => result.current.execute(ids));
  return { run, onDeleted, onMissing };
}

beforeEach(() => vi.clearAllMocks());

describe("useDeleteConversations", () => {
  it("elimina una sola por su endpoint y avisa del éxito", async () => {
    api.deleteConversation.mockResolvedValue({ deleted: 1, deletedIds: ["a"] });
    const { run, onDeleted } = setup();

    await run(["a"]);

    expect(api.deleteConversation).toHaveBeenCalledWith("a");
    expect(api.deleteConversations).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("inbox.notify.deletedOne");
    expect(onDeleted).toHaveBeenCalledWith(["a"]);
  });

  it("elimina varias en una sola petición, sin repetir ids", async () => {
    api.deleteConversations.mockResolvedValue({ deleted: 2, deletedIds: ["a", "b"] });
    const { run, onDeleted } = setup();

    await run(["a", "b", "a"]);

    expect(api.deleteConversations).toHaveBeenCalledWith(["a", "b"]);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(["a", "b"]);
  });

  it("con resultado parcial dice cuántas salieron y solo quita esas", async () => {
    api.deleteConversations.mockResolvedValue({ deleted: 1, deletedIds: ["b"] });
    const { run, onDeleted } = setup();

    await run(["a", "b", "c"]);

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledWith(["b"]);
  });

  it("un 404 significa que ya no existían: avisa y pide refrescar, sin éxito ni error", async () => {
    api.deleteConversations.mockRejectedValue(refused(404));
    const { run, onDeleted, onMissing } = setup();

    await run(["a", "b"]);

    expect(onMissing).toHaveBeenCalledWith(["a", "b"]);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("un 403 no quita nada ni duplica el aviso global de permiso", async () => {
    api.deleteConversation.mockRejectedValue(refused(403));
    const { run, onDeleted, onMissing } = setup();

    await run(["a"]);

    expect(onDeleted).not.toHaveBeenCalled();
    expect(onMissing).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("cualquier otro fallo se muestra como error y no quita nada", async () => {
    api.deleteConversation.mockRejectedValue(refused(500));
    const { run, onDeleted } = setup();

    await run(["a"]);

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("sin ids no llama al servidor", async () => {
    const { run } = setup();

    await run([]);

    expect(api.deleteConversation).not.toHaveBeenCalled();
    expect(api.deleteConversations).not.toHaveBeenCalled();
  });
});
