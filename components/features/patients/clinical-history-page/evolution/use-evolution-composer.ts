"use client";

import { useCallback, useMemo, useState } from "react";

import type { Appointment } from "@/lib/entity/appointment/appointments";
import { parseLocalValue } from "@/lib/datetime";
import { formatVisitDate } from "@/lib/utils/visit-eligibility";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

export type ComposerMode =
  | { kind: "ready"; appointmentId: string }
  | { kind: "needs-consultation" }
  | { kind: "read-only" }
  | { kind: "loading" };
export interface UseEvolutionComposerParams {
  appointments: Appointment[];
  loading?: boolean;
  activeAppointmentId?: string | null;
  canWriteClinicalHistory?: boolean;
}
export interface UseEvolutionComposerResult {
  mode: ComposerMode;
  value: string;
  setValue: (value: string) => void;
  clearDraft: () => void;
  soapEnabled: boolean;
  setSoapEnabled: (enabled: boolean) => void;
  contextLabel: string;
  canWrite: boolean;
}
export function draftToHtml(draft: string): string {
  const escaped = draft
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${line}</p>`)
    .join("");
}
export function useEvolutionComposer({
  appointments,
  loading = false,
  activeAppointmentId,
  canWriteClinicalHistory,
}: UseEvolutionComposerParams): UseEvolutionComposerResult {
  const [value, setValue] = useState("");
  const [soapEnabled, setSoapEnabled] = useState(false);
  const { isAdmin, can } = usePermission();
  const canWriteDerived =
    canWriteClinicalHistory ??
    (isAdmin ||
      can("clinical_history", PermissionAction.EDIT) ||
      can("clinical_history", PermissionAction.CREATE));
  const mode = useMemo<ComposerMode>(() => {

    if (!canWriteDerived) return { kind: "read-only" };
    if (loading) return { kind: "loading" };
    const preferred = activeAppointmentId
      ? appointments.find(
          (appointment) =>
            appointment.id === activeAppointmentId &&
            appointment.status === "in_progress",
        )
      : undefined;
    const running =
      preferred ??
      appointments.find((appointment) => appointment.status === "in_progress");
    if (running) return { kind: "ready", appointmentId: running.id };
    return { kind: "needs-consultation" };
  }, [appointments, activeAppointmentId, canWriteDerived, loading]);
  const contextLabel = useMemo(() => {
    switch (mode.kind) {
      case "ready": {
        const visit = appointments.find(
          (appointment) => appointment.id === mode.appointmentId,
        );
        const date = parseLocalValue(visit?.date);
        if (!date) return "Se guardará en la consulta en curso";
        return `Se guardará en la consulta del ${formatVisitDate(date)}`;
      }
      case "needs-consultation":
        return "No hay consulta en curso · se abrirá una para registrar esta evolución";
      case "loading":
        return "Comprobando si hay una consulta en curso…";
      case "read-only":
        return "";
      default: {
        const never: never = mode;
        return never;
      }
    }
  }, [mode, appointments]);
  const clearDraft = useCallback(() => setValue(""), []);
  return {
    mode,
    value,
    setValue,
    clearDraft,
    soapEnabled,
    setSoapEnabled,
    contextLabel,
    canWrite: mode.kind === "ready" || mode.kind === "needs-consultation",
  };
}
export default useEvolutionComposer;
