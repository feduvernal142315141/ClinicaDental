"use client";

import { useCallback, useMemo } from "react";
import { useClinicalNotes } from "@/lib/hooks/clinical-history";
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

interface UseMedicalAntecedentsColumnParams {
  patientId: string;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
}

export function useMedicalAntecedentsColumn({
  patientId,
  medicalHistory,
  patientHeader,
}: UseMedicalAntecedentsColumnParams) {
  const { saving, save } = useClinicalNotes(
    patientId,
    medicalHistory?.clinicalNotes,
  );

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

  const handleSaveNotes = useCallback(
    async (html: string) => {
      await save(html);
    },
    [save],
  );

  return {
    saving,
    alertBadges,
    antecedentItems,
    handleSaveNotes,
  };
}
