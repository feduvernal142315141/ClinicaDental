import { createOdontogramStore, type OdontogramSnapshot } from "@/lib/odontogram/store";
import type { PerformedProcedure } from "@/lib/odontogram/domain/odontogram/types";

/** Build in an isolated store: a rejected save must never paint treatments as done. */
export function completeConsultationSelection(snapshot: OdontogramSnapshot, eventIds: string[]): OdontogramSnapshot {
  const selected = new Set(eventIds);
  const plans = snapshot.clinicalEvents.filter(event => selected.has(event.id) && event.type === "plan" && event.status !== "done" && event.status !== "canceled");
  const draft = createOdontogramStore({ patientId: snapshot.metadata.patientId, clinicId: snapshot.metadata.clinicId });
  draft.getState().replaceSnapshot(snapshot);
  const now = new Date().toISOString();
  for (const tooth of new Set(plans.map(event => event.toothNumber))) {
    const existing: PerformedProcedure[] = snapshot.clinicalEvents.filter(event => event.type === "performed" && event.toothNumber === tooth).map(event => ({
      id: event.id, visitId: event.visitId, toothNumber: tooth, surfaces: event.surfaces,
      level: event.level === "surface" ? "surface" : "tooth", procedureId: event.procedureId,
      adHocName: event.procedureName, status: event.status === "canceled" ? "canceled" : event.status === "in_progress" ? "in_progress" : "done",
      materials: [], durationMin: event.durationMin ?? 0, attachments: event.attachments ?? [], notes: event.notes,
      outcome: "ok", operatorId: event.authorId, createdAt: event.createdAt, updatedAt: event.updatedAt,
    }));
    const additions: PerformedProcedure[] = plans.filter(event => event.toothNumber === tooth).map(event => ({
      id: `performed:${event.id}`, fromPlanId: event.id, visitId: snapshot.metadata.visitId,
      toothNumber: tooth, surfaces: event.surfaces, level: event.surfaces.length ? "surface" : "tooth",
      procedureId: event.procedureId ?? event.serviceId, adHocName: event.procedureName ?? event.serviceName,
      status: "done", materials: [], durationMin: event.durationMin ?? 0, attachments: event.attachments ?? [],
      notes: event.notes, outcome: "ok", operatorId: snapshot.metadata.authorId, createdAt: now, updatedAt: now,
    }));
    const newIds = new Set(additions.map(event => event.id));
    draft.getState().persistPerformedProcedures(tooth, [...existing.filter(event => !newIds.has(event.id)), ...additions]);
  }
  const result = draft.getState().getSnapshot();
  return { ...result, clinicalEvents: result.clinicalEvents.map(event => {
    const plan = plans.find(item => event.id === `performed:${item.id}`);
    return plan ? { ...event, serviceId: plan.serviceId, serviceCode: plan.serviceCode, serviceName: plan.serviceName, serviceCost: plan.serviceCost } : event;
  }) };
}
