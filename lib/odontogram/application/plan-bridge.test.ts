import { describe, expect, it, vi } from "vitest";
import {
  odontogramPlanEntries,
  planBridgeChanges,
  syncOdontogramPlan,
  type OdontogramPlanEntry,
  type PlanBridgeGateway,
  type PlanBridgeLine,
} from "./plan-bridge";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";
import type { AddPlanItemRequest } from "@/lib/entity/odontogram";

const SERVICE = "0b6f1c7e-3a52-4d0c-9b1e-2f4a5c6d7e8f";
const OTHER_SERVICE = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

const entry = (overrides: Partial<OdontogramPlanEntry> = {}): OdontogramPlanEntry => ({
  eventId: "event-1",
  serviceId: SERVICE,
  toothNumber: 26,
  surfaces: ["mesial"],
  status: "plan",
  priority: "media",
  notes: null,
  ...overrides,
});

const line = (overrides: Partial<PlanBridgeLine> = {}): PlanBridgeLine => ({
  id: "line-1",
  syncKey: "odo:event-1",
  status: "plan",
  priority: "media",
  notes: null,
  sessionsDone: 0,
  ...overrides,
});

const event = (overrides: Partial<ClinicalEvent> = {}): ClinicalEvent => ({
  id: "event-1",
  toothNumber: 26,
  surfaces: [],
  type: "plan",
  status: "plan",
  procedureId: SERVICE,
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  ...overrides,
});

describe("odontogramPlanEntries", () => {
  it("reads catalog procedures planned on teeth, faces once and in reading order", () => {
    const entries = odontogramPlanEntries([
      event({
        surfaces: ["distalOclusal", "mesialVestibular", "mesialOclusal", "oclusal"],
        priority: "alta",
        notes: "  con anestesia  ",
      }),
      event({ id: "diagnosis", type: "diagnosis" }),
      event({ id: "template", procedureId: undefined }),
    ]);

    expect(entries).toEqual([
      {
        eventId: "event-1",
        serviceId: SERVICE,
        toothNumber: 26,
        surfaces: ["mesial", "oclusal", "distal"],
        status: "plan",
        priority: "alta",
        notes: "con anestesia",
      },
    ]);
  });

  it("defaults what the plan cannot carry: unknown status, no priority, blank notes", () => {
    const [read] = odontogramPlanEntries([
      event({ status: "observation", priority: undefined, notes: "   " }),
    ]);

    expect(read).toMatchObject({ status: "plan", priority: "media", notes: null });
  });
});

describe("planBridgeChanges", () => {
  it("adds a line for a procedure planned on a tooth, keyed to its event", () => {
    expect(planBridgeChanges([entry({ notes: "urgente" })], [])).toEqual({
      add: [
        {
          serviceId: SERVICE,
          toothNumbers: "[26]",
          surfaces: '["mesial"]',
          odontogramEventIds: '["event-1"]',
          syncKey: "odo:event-1",
          quantity: 1,
          sessionsPlanned: 1,
          notes: "urgente",
        },
      ],
      update: [],
      remove: [],
    });
  });

  it("adds nothing for a procedure cancelled before it reached the plan", () => {
    expect(planBridgeChanges([entry({ status: "canceled" })], []).add).toEqual([]);
  });

  it("leaves alone a line that already says what the tooth says", () => {
    expect(planBridgeChanges([entry()], [line()])).toEqual({ add: [], update: [], remove: [] });
  });

  it("ignores procedures whose service id is not a UUID", () => {
    expect(planBridgeChanges([entry({ serviceId: "custom" })], [])).toEqual({
      add: [],
      update: [],
      remove: [],
    });
  });

  it("moves the line forward when work advanced on the tooth", () => {
    expect(planBridgeChanges([entry({ status: "in_progress" })], [line()]).update).toEqual([
      { itemId: "line-1", changes: { status: "in_progress" } },
    ]);
    expect(
      planBridgeChanges([entry({ status: "done" })], [line({ status: "scheduled" })]).update,
    ).toEqual([{ itemId: "line-1", changes: { status: "done" } }]);
  });

  it("never undoes progress made on the plan", () => {
    expect(planBridgeChanges([entry({ status: "plan" })], [line({ status: "done" })]).update).toEqual([]);
    expect(
      planBridgeChanges([entry({ status: "scheduled" })], [line({ status: "in_progress" })]).update,
    ).toEqual([]);
    // `open` y `plan` son el mismo punto del avance.
    expect(planBridgeChanges([entry({ status: "open" })], [line({ status: "plan" })]).update).toEqual([]);
  });

  it("cancels a line whose procedure was cancelled, unless it was already done", () => {
    expect(
      planBridgeChanges([entry({ status: "canceled" })], [line({ status: "in_progress" })]).update,
    ).toEqual([{ itemId: "line-1", changes: { status: "canceled" } }]);
    expect(
      planBridgeChanges([entry({ status: "canceled" })], [line({ status: "done" })]).update,
    ).toEqual([]);
  });

  it("carries priority and notes from the tooth, sending only what differs", () => {
    expect(
      planBridgeChanges([entry({ priority: "alta", notes: "revisar" })], [line()]).update,
    ).toEqual([{ itemId: "line-1", changes: { priority: "alta", notes: "revisar" } }]);
    expect(
      planBridgeChanges([entry({ notes: null })], [line({ notes: "vieja" })]).update,
    ).toEqual([{ itemId: "line-1", changes: { notes: "" } }]);
    // Sin nota en un lado y cadena vacía en el otro es lo mismo.
    expect(planBridgeChanges([entry({ notes: null })], [line({ notes: "" })]).update).toEqual([]);
  });

  it("removes the line of a procedure taken off the tooth", () => {
    expect(planBridgeChanges([], [line()]).remove).toEqual(["line-1"]);
  });

  it("keeps a removed procedure's line once work on it was recorded", () => {
    expect(planBridgeChanges([], [line({ sessionsDone: 1 })]).remove).toEqual([]);
    expect(planBridgeChanges([], [line({ status: "done" })]).remove).toEqual([]);
    expect(planBridgeChanges([], [line({ status: "canceled" })]).remove).toEqual([]);
  });

  it("never touches lines added by hand", () => {
    const manual = [
      line({ id: "manual-1", syncKey: null, priority: "baja" }),
      line({ id: "manual-2", syncKey: "import:event-1", status: "scheduled" }),
    ];

    expect(planBridgeChanges([], manual)).toEqual({ add: [], update: [], remove: [] });
    expect(planBridgeChanges([entry({ priority: "alta" })], manual)).toMatchObject({
      update: [],
      remove: [],
    });
  });
});

/** Un plan en memoria que se comporta como el servidor en lo que al puente importa. */
function fakePlan(initial: { id: string; items: PlanBridgeLine[] } | null = null) {
  let plan = initial;
  let nextId = 1;
  const gateway = {
    getActivePlan: vi.fn(async () => (plan ? { id: plan.id, items: [...plan.items] } : null)),
    ensurePlan: vi.fn(async () => {
      plan ??= { id: "plan-1", items: [] };
      return plan.id;
    }),
    addItem: vi.fn(async (_planId: string, item: AddPlanItemRequest) => {
      // Idempotencia por `syncKey`; el servidor crea la línea en `plan`/`media`.
      if (plan!.items.some((existing) => existing.syncKey === item.syncKey)) return 0;
      plan!.items.push({
        id: `line-${nextId++}`,
        syncKey: item.syncKey ?? null,
        status: "plan",
        priority: "media",
        notes: item.notes ?? null,
        sessionsDone: 0,
      });
      return 1;
    }),
    updateItem: vi.fn(async (itemId: string, changes: Partial<PlanBridgeLine>) => {
      plan!.items = plan!.items.map((existing) =>
        existing.id === itemId ? { ...existing, ...changes } : existing,
      );
      return true;
    }),
    removeItem: vi.fn(async (itemId: string) => {
      plan!.items = plan!.items.filter((existing) => existing.id !== itemId);
      return true;
    }),
  } satisfies PlanBridgeGateway;
  const writes = () =>
    gateway.ensurePlan.mock.calls.length +
    gateway.addItem.mock.calls.length +
    gateway.updateItem.mock.calls.length +
    gateway.removeItem.mock.calls.length;
  return { gateway, writes, items: () => plan?.items ?? [] };
}

describe("syncOdontogramPlan", () => {
  it("writes nothing when there is no plan and nothing to add", async () => {
    const { gateway, writes } = fakePlan();

    const result = await syncOdontogramPlan({ patientId: "patient-1", entries: [] }, gateway);

    expect(result).toEqual({ changed: false });
    expect(writes()).toBe(0);
  });

  it("opens the plan only when there is something to add", async () => {
    const { gateway, items } = fakePlan();

    const result = await syncOdontogramPlan({ patientId: "patient-1", entries: [entry()] }, gateway);

    expect(result).toEqual({ changed: true });
    expect(gateway.ensurePlan).toHaveBeenCalledTimes(1);
    expect(items().map((item) => item.syncKey)).toEqual(["odo:event-1"]);
  });

  it("does not open a second plan when the patient already has one", async () => {
    const { gateway } = fakePlan({ id: "plan-9", items: [] });

    await syncOdontogramPlan({ patientId: "patient-1", entries: [entry()] }, gateway);

    expect(gateway.ensurePlan).not.toHaveBeenCalled();
    expect(gateway.addItem).toHaveBeenCalledWith("plan-9", expect.objectContaining({ syncKey: "odo:event-1" }));
  });

  it("sends one request per line", async () => {
    const { gateway } = fakePlan();
    const entries = [
      entry(),
      entry({ eventId: "event-2", serviceId: OTHER_SERVICE, toothNumber: 36 }),
      entry({ eventId: "event-3", toothNumber: 46 }),
    ];

    await syncOdontogramPlan({ patientId: "patient-1", entries }, gateway);

    expect(gateway.addItem).toHaveBeenCalledTimes(3);
    expect(gateway.addItem.mock.calls.map(([, item]) => item.syncKey)).toEqual([
      "odo:event-1",
      "odo:event-2",
      "odo:event-3",
    ]);
  });

  it("reads the plan again after adding, then gives the new line its priority and progress", async () => {
    const { gateway, items } = fakePlan();

    await syncOdontogramPlan(
      { patientId: "patient-1", entries: [entry({ priority: "alta", status: "scheduled" })] },
      gateway,
    );

    expect(gateway.getActivePlan).toHaveBeenCalledTimes(2);
    expect(gateway.updateItem).toHaveBeenCalledWith("line-1", { status: "scheduled", priority: "alta" });
    expect(items()[0]).toMatchObject({ status: "scheduled", priority: "alta" });
  });

  it("converges: a second run with the same odontogram writes nothing", async () => {
    const { gateway, writes } = fakePlan();
    const input = { patientId: "patient-1", entries: [entry({ priority: "alta" })] };

    await syncOdontogramPlan(input, gateway);
    const afterFirst = writes();
    const second = await syncOdontogramPlan(input, gateway);

    expect(second).toEqual({ changed: false });
    expect(writes()).toBe(afterFirst);
  });

  it("removes the line when the procedure leaves the tooth, and leaves manual lines alone", async () => {
    const manual = line({ id: "manual", syncKey: null });
    const { gateway, items } = fakePlan({ id: "plan-1", items: [line(), manual] });

    const result = await syncOdontogramPlan({ patientId: "patient-1", entries: [] }, gateway);

    expect(result).toEqual({ changed: true });
    expect(gateway.removeItem).toHaveBeenCalledWith("line-1");
    expect(items()).toEqual([manual]);
  });

  it("stops at the first failure and reports what it already wrote", async () => {
    const { gateway } = fakePlan();
    const refused = new Error("403");
    gateway.addItem.mockResolvedValueOnce(1).mockRejectedValueOnce(refused);
    const entries = [
      entry(),
      entry({ eventId: "event-2" }),
      entry({ eventId: "event-3" }),
    ];

    const result = await syncOdontogramPlan({ patientId: "patient-1", entries }, gateway);

    expect(result).toEqual({ changed: true, error: refused });
    expect(gateway.addItem).toHaveBeenCalledTimes(2);
    expect(gateway.updateItem).not.toHaveBeenCalled();
    expect(gateway.removeItem).not.toHaveBeenCalled();
  });

  it("does not create a plan when reading it fails", async () => {
    const { gateway, writes } = fakePlan();
    const down = new Error("500");
    gateway.getActivePlan.mockRejectedValueOnce(down);

    const result = await syncOdontogramPlan({ patientId: "patient-1", entries: [entry()] }, gateway);

    expect(result).toEqual({ changed: false, error: down });
    expect(writes()).toBe(0);
  });
});
