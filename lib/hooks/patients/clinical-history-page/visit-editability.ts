import type { Appointment } from "@/lib/entity/appointment/appointments";

export type VisitEditability =
  | { kind: "no-visit" }
  | { kind: "unknown" }
  | { kind: "editable" }
  | { kind: "locked"; reason: "terminal" | "not-started" | "not-listed" };
export interface VisitEditabilityInput {
  appointmentId?: string;
  appointments: Appointment[];
  appointmentsLoading: boolean;
  verifiedStatus?: Appointment["status"];
}
export function getVisitEditability({
  appointmentId,
  appointments,
  appointmentsLoading,
  verifiedStatus,
}: VisitEditabilityInput): VisitEditability {
  if (!appointmentId) return { kind: "no-visit" };
  const fromStatus = (status: Appointment["status"]): VisitEditability => {
    if (status === "in_progress") return { kind: "editable" };
    if (status === "scheduled") return { kind: "locked", reason: "not-started" };
    return { kind: "locked", reason: "terminal" };
  };
  if (verifiedStatus) return fromStatus(verifiedStatus);
  if (appointmentsLoading) return { kind: "unknown" };
  const fromList = appointments.find((a) => a.id === appointmentId);
  if (fromList) return fromStatus(fromList.status);
  return { kind: "locked", reason: "not-listed" };
}
export function isEditableVisit(editability: VisitEditability): boolean {
  return editability.kind === "editable";
}
export function isLockedVisit(editability: VisitEditability): boolean {
  return editability.kind === "locked";
}
