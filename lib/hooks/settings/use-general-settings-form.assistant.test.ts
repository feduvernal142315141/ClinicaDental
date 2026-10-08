import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_CLINIC_GENERAL_SETTINGS, type ClinicGeneralSettings } from "@/lib/entity/settings";

const state = vi.hoisted(() => ({ settings: null as unknown, saveSettings: vi.fn() }));
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
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ can: () => true, isAdmin: true }) }));

import { useGeneralSettingsForm } from "./use-general-settings-form";

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
