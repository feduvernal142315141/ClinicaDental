import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPlanBridgeController,
  PLAN_BRIDGE_SETTLE_MS,
  type PlanBridgeControllerGateway,
  type PlanBridgeSnapshot,
  type PlanBridgeSyncStatus,
} from "./plan-bridge-controller";
import type { PlanBridgeLine } from "./plan-bridge";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";

const SERVICE = "0b6f1c7e-3a52-4d0c-9b1e-2f4a5c6d7e8f";

const planEvent = (id: string, overrides: Partial<ClinicalEvent> = {}): ClinicalEvent => ({
  id,
  toothNumber: 26,
  surfaces: [],
  type: "plan",
  status: "plan",
  procedureId: SERVICE,
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  ...overrides,
});

const snapshot = (events: ClinicalEvent[], patientId = "patient-1"): PlanBridgeSnapshot => ({
  clinicalEvents: events,
  metadata: { patientId },
});

const bridgedLine = (eventId: string): PlanBridgeLine => ({
  id: `line-${eventId}`,
  syncKey: `odo:${eventId}`,
  status: "plan",
  priority: "media",
  notes: null,
  sessionsDone: 0,
});

/** Servidor en memoria: el odontograma guardado y el plan del paciente. */
function setup(options: { persisted?: ClinicalEvent[]; lines?: PlanBridgeLine[] } = {}) {
  const server = {
    persisted: options.persisted ?? [],
    lines: options.lines ?? [],
  };
  const gateway = {
    readPersistedEvents: vi.fn(async () => server.persisted),
    getActivePlan: vi.fn(async () => ({ id: "plan-1", items: [...server.lines] })),
    ensurePlan: vi.fn(async () => "plan-1"),
    addItem: vi.fn(async (_planId: string, item: { syncKey?: string | null }) => {
      server.lines.push({
        id: `line-${server.lines.length + 1}`,
        syncKey: item.syncKey ?? null,
        status: "plan",
        priority: "media",
        notes: null,
        sessionsDone: 0,
      });
      return 1;
    }),
    updateItem: vi.fn(async () => true),
    removeItem: vi.fn(async (itemId: string) => {
      server.lines = server.lines.filter((existing) => existing.id !== itemId);
      return true;
    }),
  } satisfies PlanBridgeControllerGateway;
  const statuses: PlanBridgeSyncStatus[] = [];
  const onPlanChanged = vi.fn();
  const controller = createPlanBridgeController({
    patientId: "patient-1",
    gateway,
    onStatus: (status) => statuses.push(status),
    onPlanChanged,
  });
  const touched = () =>
    gateway.readPersistedEvents.mock.calls.length + gateway.getActivePlan.mock.calls.length;
  const writes = () =>
    gateway.ensurePlan.mock.calls.length +
    gateway.addItem.mock.calls.length +
    gateway.updateItem.mock.calls.length +
    gateway.removeItem.mock.calls.length;
  return { controller, gateway, server, statuses, onPlanChanged, touched, writes };
}

const settle = () => vi.advanceTimersByTimeAsync(PLAN_BRIDGE_SETTLE_MS);
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("plan bridge controller", () => {
  it("does nothing until the odontogram is reported in sync (still loading, or the load failed)", async () => {
    // Un odontograma que nunca llegó no es «nada planificado»: la línea se queda.
    const { controller, touched, writes, server } = setup({ lines: [bridgedLine("event-1")] });

    controller.outOfSync();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(touched()).toBe(0);
    expect(writes()).toBe(0);
    expect(server.lines).toHaveLength(1);
  });

  it("brings what was already planned to the plan as soon as the chart loads", async () => {
    const events = [planEvent("event-1")];
    const { controller, gateway, onPlanChanged, statuses } = setup({ persisted: events });

    controller.inSync(snapshot(events));
    await flush();

    expect(gateway.addItem).toHaveBeenCalledTimes(1);
    expect(onPlanChanged).toHaveBeenCalledWith("patient-1");
    expect(statuses).toEqual(["syncing", "idle"]);
  });

  it("waits for the doctor to stop before syncing a change", async () => {
    const { controller, gateway, server } = setup();
    controller.inSync(snapshot([]));
    await flush();

    const events = [planEvent("event-1")];
    server.persisted = events;
    controller.inSync(snapshot(events));
    await vi.advanceTimersByTimeAsync(PLAN_BRIDGE_SETTLE_MS - 1);
    expect(gateway.addItem).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(gateway.addItem).toHaveBeenCalledTimes(1);
  });

  it("does not run again for an odontogram that plans the same", async () => {
    const events = [planEvent("event-1")];
    const { controller, touched } = setup({ persisted: events });
    controller.inSync(snapshot(events));
    await flush();
    const afterFirst = touched();

    // Otro guardado (p. ej. un diagnóstico) que no cambia lo planificado.
    controller.inSync(snapshot([...events, planEvent("dx", { type: "diagnosis" })]));
    await settle();

    expect(touched()).toBe(afterFirst);
  });

  it("drops a pending sync when the odontogram stops being in sync (edited, or its save was refused)", async () => {
    const { controller, server, touched, writes } = setup();
    controller.inSync(snapshot([]));
    await flush();
    const afterFirst = touched();

    const events = [planEvent("event-1")];
    server.persisted = events;
    controller.inSync(snapshot(events));
    // Guardado rechazado (409 de versión, red caída) o nueva edición sin guardar.
    controller.outOfSync();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(touched()).toBe(afterFirst);
    expect(writes()).toBe(0);
  });

  it("never removes lines from a stale chart: another device planned after this one loaded", async () => {
    // El otro equipo planificó event-2 y lo guardó; su línea ya está en el plan.
    const { controller, server, writes, statuses, onPlanChanged } = setup({
      persisted: [planEvent("event-1"), planEvent("event-2")],
      lines: [bridgedLine("event-1"), bridgedLine("event-2")],
    });

    // Este cliente sigue viendo solo event-1 y el servidor le aceptó el guardado.
    controller.inSync(snapshot([planEvent("event-1")]));
    await flush();

    expect(writes()).toBe(0);
    expect(server.lines).toHaveLength(2);
    expect(onPlanChanged).not.toHaveBeenCalled();
    expect(statuses).toEqual(["syncing", "stale"]);
  });

  it("does not touch the plan when the saved odontogram cannot be read", async () => {
    const events = [planEvent("event-1")];
    const { controller, gateway, writes, statuses } = setup({ persisted: events });
    gateway.readPersistedEvents.mockRejectedValueOnce(new Error("offline"));

    controller.inSync(snapshot(events));
    await flush();

    expect(gateway.getActivePlan).not.toHaveBeenCalled();
    expect(writes()).toBe(0);
    expect(statuses).toEqual(["syncing", "failed"]);
  });

  it("retries after a failure the next time the same odontogram is in sync", async () => {
    const events = [planEvent("event-1")];
    const { controller, gateway } = setup({ persisted: events });
    gateway.addItem.mockRejectedValueOnce(new Error("403"));
    controller.inSync(snapshot(events));
    await flush();

    controller.inSync(snapshot(events));
    await settle();

    expect(gateway.addItem).toHaveBeenCalledTimes(2);
  });

  it("stays quiet while read-only, and for another patient's chart", async () => {
    const events = [planEvent("event-1")];
    const { controller, touched } = setup({ persisted: events });

    controller.setEnabled(false);
    controller.inSync(snapshot(events));
    controller.setEnabled(true);
    controller.inSync(snapshot(events, "patient-2"));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(touched()).toBe(0);
  });

  it("runs one sync at a time and, of those asked meanwhile, only the latest", async () => {
    const first = [planEvent("event-1")];
    const { controller, gateway, server } = setup({ persisted: first });
    let release: () => void = () => undefined;
    let concurrent = 0;
    let maxConcurrent = 0;
    gateway.getActivePlan.mockImplementation(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      if (gateway.getActivePlan.mock.calls.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      concurrent -= 1;
      return { id: "plan-1", items: [...server.lines] };
    });

    controller.inSync(snapshot(first));
    await flush();
    expect(gateway.getActivePlan).toHaveBeenCalledTimes(1);

    const second = [...first, planEvent("event-2")];
    const third = [...second, planEvent("event-3")];
    controller.inSync(snapshot(second));
    await settle();
    server.persisted = third;
    controller.inSync(snapshot(third));
    await settle();
    expect(gateway.addItem).not.toHaveBeenCalled();

    release();
    await flush();

    expect(maxConcurrent).toBe(1);
    expect(server.lines.map((existing) => existing.syncKey)).toEqual([
      "odo:event-1",
      "odo:event-2",
      "odo:event-3",
    ]);
    // La segunda petición nunca corrió: solo la primera y la última leyeron el odontograma guardado.
    expect(gateway.readPersistedEvents).toHaveBeenCalledTimes(2);
  });

  it("stops for good once disposed", async () => {
    const events = [planEvent("event-1")];
    const { controller, touched } = setup({ persisted: events });

    controller.inSync(snapshot(events));
    controller.dispose();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(touched()).toBe(0);
  });
});
