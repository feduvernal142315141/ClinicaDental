import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OdontogramModule } from "./OdontogramModule";
import {
  createEmptySnapshot,
  useOdontogramStoreApi,
  type OdontogramAdapter,
  type OdontogramSnapshot,
} from "./store";

vi.mock("@/lib/contexts/i18n-context", () => {
  const t = (key: string) => key;
  return { useI18n: () => ({ t }) };
});
vi.mock("@/components/features/odontogram/consultation-documents", () => ({
  ConsultationDocuments: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/features/odontogram/finalize-appointment-modal", () => ({
  FinalizarCitaModal: () => null,
}));
// La vista real no hace falta: basta un botón que planifique sobre una pieza.
vi.mock("@/components/odontogram/odontogram-module", () => ({
  OdontogramModule: function View() {
    const storeApi = useOdontogramStoreApi();
    return (
      <button
        onClick={() =>
          storeApi.getState().addClinicalEvent({
            toothNumber: 26,
            surfaces: [],
            level: "tooth",
            type: "plan",
            status: "plan",
            procedureId: "0b6f1c7e-3a52-4d0c-9b1e-2f4a5c6d7e8f",
          })
        }
      >
        Planificar
      </button>
    );
  },
}));

const PATIENT = "patient-1";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mount(adapter: OdontogramAdapter) {
  const onInSync = vi.fn<(snapshot: OdontogramSnapshot) => void>();
  const onOutOfSync = vi.fn();
  render(
    <OdontogramModule
      patientId={PATIENT}
      adapter={adapter}
      showHeader={false}
      onInSync={onInSync}
      onOutOfSync={onOutOfSync}
    />,
  );
  return { onInSync, onOutOfSync };
}

const loaded = () => Promise.resolve(createEmptySnapshot({ patientId: PATIENT }));
const plannedIn = (snapshot: OdontogramSnapshot) =>
  snapshot.clinicalEvents.filter((event) => event.type === "plan").length;

describe("OdontogramModule in-sync signals", () => {
  it("is out of sync while the odontogram is loading", async () => {
    const load = deferred<OdontogramSnapshot>();
    const { onInSync, onOutOfSync } = mount({ load: () => load.promise, save: vi.fn() });

    await act(async () => {});

    expect(onOutOfSync).toHaveBeenCalled();
    expect(onInSync).not.toHaveBeenCalled();
  });

  it("never reports in sync when the load failed", async () => {
    const save = vi.fn();
    const { onInSync } = mount({ load: () => Promise.reject(new Error("500")), save });

    expect(await screen.findByText("No se pudo cargar el odontograma.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Planificar" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));

    expect(save).not.toHaveBeenCalled();
    expect(onInSync).not.toHaveBeenCalled();
  });

  it("reports the loaded odontogram, then each change once the server accepted it", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { onInSync, onOutOfSync } = mount({ load: loaded, save });

    await waitFor(() => expect(onInSync).toHaveBeenCalledTimes(1));
    expect(onInSync.mock.calls[0][0].metadata.patientId).toBe(PATIENT);
    expect(plannedIn(onInSync.mock.calls[0][0])).toBe(0);

    onOutOfSync.mockClear();
    fireEvent.click(await screen.findByRole("button", { name: "Planificar" }));
    // Editado y todavía sin guardar: ya no está al día.
    expect(onOutOfSync).toHaveBeenCalled();
    expect(onInSync).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(onInSync).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenCalledTimes(1);
    expect(plannedIn(onInSync.mock.calls[1][0])).toBe(1);
  });

  it("stays out of sync when the save is refused (version conflict)", async () => {
    const save = vi.fn().mockRejectedValue(Object.assign(new Error("Versión obsoleta"), { status: 409 }));
    const { onInSync, onOutOfSync } = mount({ load: loaded, save });
    await waitFor(() => expect(onInSync).toHaveBeenCalledTimes(1));

    onOutOfSync.mockClear();
    fireEvent.click(await screen.findByRole("button", { name: "Planificar" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No se pudo sincronizar el odontograma.")).toBeInTheDocument();

    expect(onInSync).toHaveBeenCalledTimes(1);
    // Una vez por la edición y otra por el rechazo.
    expect(onOutOfSync).toHaveBeenCalledTimes(2);
  });

  it("does not report in sync a save that was overtaken by a newer edit", async () => {
    const firstSave = deferred<void>();
    const save = vi.fn().mockReturnValueOnce(firstSave.promise).mockResolvedValue(undefined);
    const { onInSync } = mount({ load: loaded, save });
    await waitFor(() => expect(onInSync).toHaveBeenCalledTimes(1));

    const plan = await screen.findByRole("button", { name: "Planificar" });
    fireEvent.click(plan);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    // Segunda edición mientras el primer guardado sigue en vuelo.
    fireEvent.click(plan);
    await act(async () => firstSave.resolve());

    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onInSync).toHaveBeenCalledTimes(2));
    expect(plannedIn(onInSync.mock.calls[1][0])).toBe(2);
  });
});
