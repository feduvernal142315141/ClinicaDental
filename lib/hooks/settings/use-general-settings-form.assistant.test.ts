import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_CLINIC_GENERAL_SETTINGS, type ClinicGeneralSettings } from "@/lib/entity/settings";

const state = vi.hoisted(() => ({
  settings: null as unknown,
  saveSettings: vi.fn(),
  setAssistantName: vi.fn(),
}));
vi.mock("@/lib/hooks/settings/use-clinic-general-settings", () => ({
  useClinicGeneralSettings: () => ({
    settings: state.settings,
    loading: false,
    saving: false,
    error: null,
    reload: vi.fn(),
    saveSettings: state.saveSettings,
  }),
}));
vi.mock("@/lib/contexts/clinic-branding-context", () => ({ useClinicBranding: () => ({ updateBranding: vi.fn() }) }));
vi.mock("@/lib/contexts/tooth-notation-context", () => ({ useToothNotation: () => ({ setNotation: vi.fn() }) }));
vi.mock("@/lib/contexts/assistant-name-context", () => ({
  useAssistantName: () => ({ setAssistantName: state.setAssistantName }),
}));
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ can: () => true, isAdmin: true }) }));

import { useGeneralSettingsForm } from "./use-general-settings-form";
import { generalSettingsFormSchema } from "./general-settings-form.schema";

// Solo datos ficticios.
const stored = (overrides: Partial<ClinicGeneralSettings> = {}): ClinicGeneralSettings => ({
  ...DEFAULT_CLINIC_GENERAL_SETTINGS,
  id: "clinic-1",
  name: "Clínica de Prueba",
  ...overrides,
});

async function render(settings: ClinicGeneralSettings) {
  state.settings = settings;
  const view = renderHook(() => useGeneralSettingsForm());
  await waitFor(() => expect(view.result.current.form.getValues("name")).toBe("Clínica de Prueba"));
  return view;
}

describe("«El asistente informa precios por chat» en Opciones Generales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.saveSettings.mockResolvedValue(true);
  });

  it("se carga de assistantSharesPrices y queda encendido si el backend no lo envía", async () => {
    const off = await render(stored({ assistantSharesPrices: false }));
    expect(off.result.current.form.getValues("assistantSharesPrices")).toBe(false);
    off.unmount();
    const missing = await render(stored({ assistantSharesPrices: undefined }));
    expect(missing.result.current.form.getValues("assistantSharesPrices")).toBe(true);
  });

  it("al apagarlo viaja en el mismo PUT y el resto de ajustes no cambia", async () => {
    const { result } = await render(stored({ assistantSharesPrices: true, sendReminders: true, reminderTime: 720 }));
    const before = result.current.form.getValues();
    await act(async () => {
      await result.current.handleSubmit({ ...before, assistantSharesPrices: false });
    });
    expect(state.saveSettings).toHaveBeenCalledTimes(1);
    const payload = state.saveSettings.mock.calls[0][0];
    expect(payload.assistantSharesPrices).toBe(false);
    expect(payload).not.toHaveProperty("clinicId");

    await act(async () => {
      await result.current.handleSubmit(before);
    });
    const unchanged = state.saveSettings.mock.calls[1][0];
    expect({ ...payload, assistantSharesPrices: true }).toEqual(unchanged);
    expect(unchanged).toMatchObject({ name: "Clínica de Prueba", sendReminders: true, reminderTime: 720, currency: "USD" });
  });
});

describe("«Nombre de la asistente» en Opciones Generales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.saveSettings.mockResolvedValue(true);
  });

  it("se carga de assistantName y es «Dalia» si el backend aún no lo envía", async () => {
    const named = await render(stored({ assistantName: "Aris" }));
    expect(named.result.current.form.getValues("assistantName")).toBe("Aris");
    named.unmount();
    for (const missing of [undefined, null, ""]) {
      const view = await render(stored({ assistantName: missing }));
      expect(view.result.current.form.getValues("assistantName")).toBe("Dalia");
      view.unmount();
    }
  });

  it("viaja recortado en el mismo PUT, sin alterar otros ajustes, y actualiza el nombre de la app", async () => {
    const { result } = await render(stored({ assistantSharesPrices: false, sendReminders: true, reminderTime: 720 }));
    const before = result.current.form.getValues();
    await act(async () => {
      await result.current.handleSubmit(before);
    });
    await act(async () => {
      await result.current.handleSubmit({ ...before, assistantName: "  Ana   María " });
    });
    const [unchanged, renamed] = state.saveSettings.mock.calls.map((call) => call[0]);
    expect(unchanged.assistantName).toBe("Dalia");
    expect(renamed.assistantName).toBe("Ana María");
    expect({ ...renamed, assistantName: "Dalia" }).toEqual(unchanged);
    expect(renamed).toMatchObject({ assistantSharesPrices: false, sendReminders: true, reminderTime: 720 });
    expect(renamed).not.toHaveProperty("clinicId");
    expect(state.setAssistantName).toHaveBeenLastCalledWith("Ana María");
  });

  it("no actualiza el nombre de la app si el guardado falla", async () => {
    state.saveSettings.mockResolvedValue(false);
    const { result } = await render(stored());
    await act(async () => {
      await result.current.handleSubmit({ ...result.current.form.getValues(), assistantName: "Aris" });
    });
    expect(state.setAssistantName).not.toHaveBeenCalled();
  });

  it("rechaza vacío, números, signos, saltos de línea y más de 30 caracteres", async () => {
    const { result } = await render(stored());
    const values = result.current.form.getValues();
    const check = (assistantName: string) =>
      generalSettingsFormSchema.safeParse({ ...values, assistantName });

    for (const valid of ["Aris", "Ana María", "Íñigo", "  Aris  ", "A".repeat(30)]) {
      expect(check(valid).success, valid).toBe(true);
    }
    for (const invalid of ["", "   ", "A", "Aris2", "Aris!", "Ana-María", "Ana\nMaría", "A".repeat(31)]) {
      const parsed = check(invalid);
      expect(parsed.success, JSON.stringify(invalid)).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["assistantName"]);
        expect(parsed.error.issues[0].message).toBe(
          "El nombre de la asistente debe tener entre 2 y 30 caracteres y solo letras y espacios.",
        );
      }
    }
  });
});
