import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const api = vi.hoisted(() => ({
  syncMetaTemplates: vi.fn(),
  republishMetaTemplates: vi.fn(),
  deleteClinicTemplate: vi.fn(),
  deleteClinicTemplates: vi.fn(),
  getClinicTemplates: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/services/template/clinic-template.service", () => ({ clinicTemplateService: api }));
vi.mock("@/lib/utils/notify", () => ({ notify: toast }));
vi.mock("@/lib/contexts/i18n-context", async () => {
  const { es } = await import("@/lib/i18n/locales/es");
  const t = (key: keyof typeof es) => es[key];
  return { useI18n: () => ({ t }) };
});

import {
  useDeleteMetaTemplates,
  useRepublishMetaTemplates,
  useSyncMetaTemplates,
} from "./use-sync-meta-templates";

const templates = [{ id: "t1", name: "recordatorio" }];

beforeEach(() => {
  vi.clearAllMocks();
  api.getClinicTemplates.mockResolvedValue(templates);
});

describe("useSyncMetaTemplates", () => {
  it("recarga la lista y resume lo importado", async () => {
    api.syncMetaTemplates.mockResolvedValue({ imported: 2, updated: 1, total: 3, message: "ok", unavailable: 0 });
    const onRefreshed = vi.fn();
    const { result } = renderHook(() => useSyncMetaTemplates(onRefreshed));

    await act(() => result.current.sync());

    expect(onRefreshed).toHaveBeenCalledWith(templates);
    expect(toast.success).toHaveBeenCalledWith("Sincronización completada", {
      description: "2 nuevas, 1 actualizadas",
    });
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("si quedaron plantillas fuera de la cuenta, lo dice y sugiere republicar", async () => {
    api.syncMetaTemplates.mockResolvedValue({ imported: 0, updated: 4, total: 4, message: "ok", unavailable: 3 });
    const onRefreshed = vi.fn();
    const { result } = renderHook(() => useSyncMetaTemplates(onRefreshed));

    await act(() => result.current.sync());

    expect(onRefreshed).toHaveBeenCalledWith(templates);
    expect(toast.success).not.toHaveBeenCalled();
    const [title, options] = toast.warning.mock.calls[0];
    expect(title).toBe("Sincronizado, con plantillas no disponibles");
    expect(options.description).toContain("3 no están en la cuenta actual de WhatsApp");
    expect(options.description).toContain("Republicar en la cuenta actual");
  });

  it("un backend que aún no envía `unavailable` se trata como cero", async () => {
    api.syncMetaTemplates.mockResolvedValue({ imported: 1, updated: 0, total: 1, message: "ok" });
    const { result } = renderHook(() => useSyncMetaTemplates(vi.fn()));

    await act(() => result.current.sync());

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("si falla, muestra el mensaje del backend y no toca la lista", async () => {
    api.syncMetaTemplates.mockRejectedValue(new Error("Meta no responde"));
    const onRefreshed = vi.fn();
    const { result } = renderHook(() => useSyncMetaTemplates(onRefreshed));

    await act(() => result.current.sync());

    expect(onRefreshed).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("No se pudo sincronizar", { description: "Meta no responde" });
  });
});

describe("useRepublishMetaTemplates", () => {
  const outcome = {
    republished: 1,
    alreadyInAccount: 0,
    skipped: [{ id: "t2", name: "promo", reason: "CREATED_OUTSIDE_PANEL" }],
    failed: [],
  };

  it("entrega el resultado completo y recarga la lista", async () => {
    api.republishMetaTemplates.mockResolvedValue(outcome);
    const onRefreshed = vi.fn();
    const { result } = renderHook(() => useRepublishMetaTemplates(onRefreshed));

    await act(() => result.current.republish());

    expect(result.current.result).toEqual(outcome);
    expect(onRefreshed).toHaveBeenCalledWith(templates);
    expect(result.current.isRepublishing).toBe(false);

    act(() => result.current.clearResult());
    expect(result.current.result).toBeNull();
  });

  it("si el backend rechaza (sin cuenta, Meta caída), muestra su mensaje y no hay resultado", async () => {
    api.republishMetaTemplates.mockRejectedValue(new Error("La clínica no tiene una cuenta de WhatsApp conectada"));
    const onRefreshed = vi.fn();
    const { result } = renderHook(() => useRepublishMetaTemplates(onRefreshed));

    await act(() => result.current.republish());

    expect(result.current.result).toBeNull();
    expect(onRefreshed).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("No se pudo republicar", {
      description: "La clínica no tiene una cuenta de WhatsApp conectada",
    });
  });

  it("si republica pero no puede recargar la lista, conserva el resultado y avisa", async () => {
    api.republishMetaTemplates.mockResolvedValue(outcome);
    api.getClinicTemplates.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useRepublishMetaTemplates(vi.fn()));

    await act(() => result.current.republish());

    expect(result.current.result).toEqual(outcome);
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("no lanza una segunda republicación mientras la primera sigue en curso", async () => {
    let release: (value: typeof outcome) => void = () => undefined;
    api.republishMetaTemplates.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const { result } = renderHook(() => useRepublishMetaTemplates(vi.fn()));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.republish();
      void result.current.republish();
    });
    await act(async () => {
      release(outcome);
      await first;
    });

    expect(api.republishMetaTemplates).toHaveBeenCalledTimes(1);
  });
});

describe("useDeleteMetaTemplates", () => {
  const refused = (status: number, message = "rechazado") => Object.assign(new Error(message), { status });

  function setup() {
    const onRefreshed = vi.fn();
    const { result } = renderHook(() => useDeleteMetaTemplates(onRefreshed));
    const run = async (ids: string[]) => {
      let deleted: string[] = [];
      await act(async () => {
        deleted = await result.current.deleteTemplates(ids);
      });
      return deleted;
    };
    return { result, run, onRefreshed };
  }

  it("si todo se eliminó, basta un aviso breve y se recarga la lista", async () => {
    api.deleteClinicTemplates.mockResolvedValue({ deleted: 2, deletedIds: ["a", "b"], blocked: [], failed: [] });
    const { result, run, onRefreshed } = setup();

    await expect(run(["a", "b"])).resolves.toEqual(["a", "b"]);

    expect(api.deleteClinicTemplates).toHaveBeenCalledWith(["a", "b"]);
    expect(toast.success).toHaveBeenCalledWith("2 plantillas eliminadas");
    expect(result.current.result).toBeNull();
    expect(onRefreshed).toHaveBeenCalledWith(templates);
  });

  it("una sola va por su endpoint", async () => {
    api.deleteClinicTemplate.mockResolvedValue({ deleted: 1, deletedIds: ["a"], blocked: [], failed: [] });
    const { run } = setup();

    await run(["a"]);

    expect(api.deleteClinicTemplate).toHaveBeenCalledWith("a");
    expect(api.deleteClinicTemplates).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Plantilla eliminada");
  });

  it("una sola bloqueada responde 200 pero no se da por eliminada: se entrega el detalle", async () => {
    const outcome = {
      deleted: 0,
      deletedIds: [],
      blocked: [{ id: "a", name: "recordatorio_24h", reason: "IN_USE_BY_REMINDER" }],
      failed: [],
    };
    api.deleteClinicTemplate.mockResolvedValue(outcome);
    const { result, run } = setup();

    await expect(run(["a"])).resolves.toEqual([]);

    expect(toast.success).not.toHaveBeenCalled();
    expect(result.current.result).toEqual(outcome);
  });

  it("con eliminadas, bloqueadas y fallidas en la misma respuesta, devuelve solo las que salieron", async () => {
    const outcome = {
      deleted: 1,
      deletedIds: ["a"],
      blocked: [{ id: "b", name: "promo", reason: "IN_USE_BY_CAMPAIGN" }],
      failed: [{ id: "c", name: "aviso", reason: "META_DELETE_FAILED" }],
    };
    api.deleteClinicTemplates.mockResolvedValue(outcome);
    const { result, run, onRefreshed } = setup();

    await expect(run(["a", "b", "c"])).resolves.toEqual(["a"]);

    expect(result.current.result).toEqual(outcome);
    expect(toast.success).not.toHaveBeenCalled();
    expect(onRefreshed).toHaveBeenCalledTimes(1);

    act(() => result.current.clearResult());
    expect(result.current.result).toBeNull();
  });

  it("un 404 significa que ya no existían: avisa y recarga la lista", async () => {
    api.deleteClinicTemplates.mockRejectedValue(refused(404));
    const { run, onRefreshed } = setup();

    await expect(run(["a", "b"])).resolves.toEqual([]);

    expect(toast.info).toHaveBeenCalledWith("Las plantillas ya no existían", expect.anything());
    expect(onRefreshed).toHaveBeenCalledWith(templates);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("un 403 no elimina nada ni duplica el aviso global de permiso", async () => {
    api.deleteClinicTemplate.mockRejectedValue(refused(403));
    const { run, onRefreshed } = setup();

    await expect(run(["a"])).resolves.toEqual([]);

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it("si no se pudo consultar Meta, muestra el mensaje y no toca la lista", async () => {
    api.deleteClinicTemplate.mockRejectedValue(refused(502, "No se pudo consultar Meta"));
    const { run, onRefreshed } = setup();

    await run(["a"]);

    expect(toast.error).toHaveBeenCalledWith("No se pudo eliminar", { description: "No se pudo consultar Meta" });
    expect(onRefreshed).not.toHaveBeenCalled();
  });
});
