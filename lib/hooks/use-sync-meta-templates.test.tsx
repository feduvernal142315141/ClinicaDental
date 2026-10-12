import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const api = vi.hoisted(() => ({
  syncMetaTemplates: vi.fn(),
  republishMetaTemplates: vi.fn(),
  getClinicTemplates: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/services/template/clinic-template.service", () => ({ clinicTemplateService: api }));
vi.mock("@/lib/utils/notify", () => ({ notify: toast }));
vi.mock("@/lib/contexts/i18n-context", async () => {
  const { es } = await import("@/lib/i18n/locales/es");
  const t = (key: keyof typeof es) => es[key];
  return { useI18n: () => ({ t }) };
});

import { useRepublishMetaTemplates, useSyncMetaTemplates } from "./use-sync-meta-templates";

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
