import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "@/lib/odontogram/store";
import { completeConsultationSelection } from "./consultation-documents";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types";
const plan = (id: string, toothNumber: number): ClinicalEvent => ({ id, toothNumber, surfaces: [], type: "plan", status: "plan", serviceId: "service-a", procedureId: "service-a", serviceName: "Synthetic procedure", createdAt: "2026-10-09T10:00:00Z", updatedAt: "2026-10-09T10:00:00Z" });
describe("consultation completion", () => {
  it("completes selected teeth together without mutating the live snapshot or unselected plans", () => {
    const snapshot = createEmptySnapshot({ patientId: "patient-a" });
    snapshot.metadata.visitId = "visit-a";
    snapshot.clinicalEvents = [plan("a",18), plan("b",48), plan("c",38)];
    const result = completeConsultationSelection(snapshot,["a","b"]);
    expect(snapshot.clinicalEvents.every(event => event.status === "plan")).toBe(true);
    expect(result.clinicalEvents.find(event => event.id === "c")?.status).toBe("plan");
    for (const id of ["a","b"]) {
      expect(result.clinicalEvents.find(event => event.id === id)?.status).toBe("done");
      expect(result.clinicalEvents.find(event => event.id === `performed:${id}`)).toMatchObject({ visitId: "visit-a", serviceId: "service-a", status: "done" });
    }
  });
  it("does not duplicate completed events or execute cancelled plans", () => {
    const snapshot = createEmptySnapshot({ patientId: "patient-a" });
    snapshot.clinicalEvents = [plan("a",18), { ...plan("b",48), status: "canceled" }];
    const once = completeConsultationSelection(snapshot,["a","b"]);
    const twice = completeConsultationSelection(once,["a","b"]);
    expect(twice.clinicalEvents.filter(event => event.type === "performed")).toHaveLength(1);
    expect(twice.clinicalEvents.find(event => event.id === "b")?.status).toBe("canceled");
  });
});
