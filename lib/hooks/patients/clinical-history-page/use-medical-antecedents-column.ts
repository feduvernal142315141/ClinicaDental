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

/**
 * Nota permanente del paciente, lista para pintar en SOLO LECTURA.
 *
 * Tres estados que no se pueden colapsar (ADR-61): no hay historia clínica
 * registrada, la hay pero sin nota, y la hay con contenido. El cuarto —fallo de
 * lectura— lo corta antes la propia columna, que ante `forbidden || loadError`
 * ni siquiera llega a pintar esta sección.
 */
export type ClinicalNoteView =
  | { kind: "no-record" }
  | { kind: "empty" }
  | {
      kind: "present";
      /** HTML ya saneado por el backend. */
      html: string;
      /** Autoría, o `null` cuando no hay constancia de quién editó (ADR-62). */
      author: string | null;
      /** Sello de última edición ya legible, o `null` si el backend no lo mandó. */
      editedAt: string | null;
    };

/** ISO del backend → "14 de agosto de 2026 18:42" en hora LOCAL. */
function formatEditStamp(iso: string | undefined): string | null {
  const local = toLocalInput(iso);
  if (!local) return null;
  const day = Number(local.slice(8, 10));
  const month = MONTHS_ES[Number(local.slice(5, 7)) - 1]?.toLowerCase();
  if (!day || !month) return null;
  return `${day} de ${month} de ${local.slice(0, 4)} ${local.slice(11, 16)}`;
}

/**
 * ¿El HTML muestra algo? Un `<p></p>` guardado por el editor ya retirado es una
 * nota VACÍA: pintarla dejaría un bloque en blanco bajo el rótulo de la nota,
 * indistinguible de una nota que se hubiera perdido.
 */
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

/**
 * Modelo de vista de la columna de antecedentes.
 *
 * NO expone ningún guardado de la nota permanente: la superficie de escritura
 * se retiró a propósito (ADR-65 — dos editores indistinguibles sobre la misma
 * nota, con guardado de reemplazo total y sin versiones). Lo que aquí se arma
 * es sólo lectura; reponer un `handleSaveNotes` sería reinstalar ese editor.
 */
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
