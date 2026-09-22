"use client";

import { useMemo } from "react";
import { MONTHS_ES, toLocalInput } from "@/lib/datetime";
import { resolveAuthorship } from "@/lib/utils/clinical-authorship";
import {
  ALERT_SEVERITY_COLORS,
  type AlertSeverity,
  type ClinicalHistoryMedicalHistory,
  type ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";

const SEVERITY_BADGE_STATUS: Record<
  AlertSeverity,
  "error" | "warning" | "processing"
> = {
  critical: "error",
  warning: "warning",
  info: "processing",
};

export type ClinicalNoteView =
  | { kind: "no-record" }
  | { kind: "empty" }
  | {
      kind: "present";
      html: string;
      author: string | null;
      editedAt: string | null;
    };
function formatEditStamp(iso: string | undefined): string | null {
  const local = toLocalInput(iso);
  if (!local) return null;
  const day = Number(local.slice(8, 10));
  const month = MONTHS_ES[Number(local.slice(5, 7)) - 1]?.toLowerCase();
  if (!day || !month) return null;
  return `${day} de ${month} de ${local.slice(0, 4)} ${local.slice(11, 16)}`;
}
function hasVisibleContent(html: string): boolean {
  if (/<(img|table|hr)\b/i.test(html)) return true;
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim().length > 0
  );
}
interface UseMedicalAntecedentsColumnParams {
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
}
export function useMedicalAntecedentsColumn({
  medicalHistory,
  patientHeader,
}: UseMedicalAntecedentsColumnParams) {
  const alertBadges = useMemo(
    () =>
      (patientHeader?.alerts ?? []).map((alert) => ({
        id: alert.id,
        message: alert.message,
        color: ALERT_SEVERITY_COLORS[alert.severity],
        status: SEVERITY_BADGE_STATUS[alert.severity],
      })),
    [patientHeader?.alerts],
  );
  const antecedentItems = useMemo(
    () => [
      {
        label: "Alergias",
        items: medicalHistory?.allergies,
        empty: "Sin alergias registradas",
      },
      {
        label: "Medicamentos actuales",
        items: medicalHistory?.currentMedications,
        empty: "Sin medicamentos registrados",
      },
      {
        label: "Cirugías previas",
        items: medicalHistory?.previousSurgeries,
        empty: "Sin cirugías registradas",
      },
      {
        label: "Enfermedades sistémicas",
        items: medicalHistory?.systemicDiseases,
        empty: "Sin enfermedades sistémicas registradas",
      },
    ],
    [medicalHistory],
  );
  const clinicalNote = useMemo<ClinicalNoteView>(() => {
    if (!medicalHistory) return { kind: "no-record" };
    const html = medicalHistory.clinicalNotes?.trim() ?? "";
    if (!html || !hasVisibleContent(html)) return { kind: "empty" };
    return {
      kind: "present",
      html,
      author: resolveAuthorship(medicalHistory.clinicalNotesUpdatedBy),
      editedAt: formatEditStamp(medicalHistory.clinicalNotesUpdatedAt),
    };
  }, [medicalHistory]);
  return {
    alertBadges,
    antecedentItems,
    clinicalNote,
  };
}
