"use client";

/**
 * useActiveConsultationNotes
 *
 * Hook que gestiona los datos de la consulta activa:
 *  - Motivo de consulta (onBlur save)
 *  - Dolor actual: objeto único (elimina race conditions del debounce)
 *    incluyendo toothRef anatómica (Fase D: dolor → diente FDI)
 *  - Diagnósticos CIE-10 (save inmediato) + sugerencias ICDAS del odontograma
 *  - Hallazgos del examen (extraoral/intraoral, debounce 1200 ms)
 *  - Notas clínicas (save explícito por el editor)
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useVisitRecord } from "@/lib/hooks/clinical-history";
import type {
  VisitDiagnosis,
  ExamFindings,
  ExamFindingsExtraoral,
  ExamFindingsIntraoral,
  DiagnosisStatus,
  ToothRef,
} from "@/lib/entity/clinical-history";
import { suggestCie10FromIcdas } from "@/lib/entity/clinical-history/icdas-cie10-map";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type { ClinicalEvent } from "@/components/odontogram/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAIN_TYPE_OPTIONS = [
  { value: "agudo", label: "Agudo" },
  { value: "pulsátil", label: "Pulsátil" },
  { value: "sordo", label: "Sordo" },
  { value: "punzante", label: "Punzante" },
  { value: "intermitente", label: "Intermitente" },
  { value: "constante", label: "Constante" },
];

const PAIN_DEBOUNCE_MS = 800;
const EXAM_DEBOUNCE_MS = 1200;

// ---------------------------------------------------------------------------
// ICDAS suggestions helper (reads from odontogram store imperatively)
// ---------------------------------------------------------------------------

/**
 * Calcula diagnósticos CIE-10 provisionales a partir de los eventos del
 * odontograma con puntuación ICDAS > 0.
 *
 * Lee la tienda de forma imperativa (no como hook) para evitar errores de
 * inicialización cuando el componente monta antes que el panel del odontograma.
 */
function computeIcdasSuggestions(events: ClinicalEvent[]): VisitDiagnosis[] {
  const seen = new Set<string>();
  const result: VisitDiagnosis[] = [];

  for (const ev of events) {
    if (ev.type !== "diagnosis") continue;

    const icdas =
      (ev.diagnosisPayload?.surfaceDiagnosis?.icdasScore as 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined) ??
      ev.icdasScore;

    if (icdas == null || icdas === 0) continue;

    const fdi = String(ev.toothNumber);
    const surface = ev.surfaces?.[0];
    const toothRef: ToothRef = surface ? { fdi, surface } : { fdi };

    const suggestions = suggestCie10FromIcdas(icdas, toothRef);
    for (const s of suggestions) {
      const key = `${s.code}:${fdi}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hook types
// ---------------------------------------------------------------------------

interface PainState {
  location: string;
  intensity: number;
  type: string | undefined;
  duration: string;
  toothRef: ToothRef | undefined;
}

interface UseActiveConsultationNotesParams {
  patientId: string;
  activeAppointmentId: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActiveConsultationNotes({
  patientId,
  activeAppointmentId,
}: UseActiveConsultationNotesParams) {
  const {
    record: visitRecord,
    saving: visitSaving,
    save: saveVisitRecord,
    saveNotes: saveVisitNotes,
    diagnoses,
    saveDiagnoses,
    saveExamFindings,
  } = useVisitRecord(patientId, activeAppointmentId);

  // ─── Chief complaint ───────────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint] = useState("");

  // ─── Pain: single consolidated object (kills debounce race conditions) ─────
  const [pain, setPain] = useState<PainState>({
    location: "",
    intensity: 0,
    type: undefined,
    duration: "",
    toothRef: undefined,
  });

  // ─── Local exam findings (debounced) ───────────────────────────────────────
  const [localExamFindings, setLocalExamFindings] = useState<ExamFindings>({});
  const examFindingsInitialized = useRef(false);

  // ─── ICDAS suggestions from odontogram ────────────────────────────────────
  const [icdasSuggestions, setIcdasSuggestions] = useState<VisitDiagnosis[]>([]);

  // ─── Debounce refs ─────────────────────────────────────────────────────────
  const painDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Sync from server record on load ──────────────────────────────────────
  useEffect(() => {
    if (!visitRecord) return;

    setChiefComplaint(visitRecord.chiefComplaint ?? "");
    setPain({
      location: visitRecord.currentPain?.location ?? "",
      intensity: visitRecord.currentPain?.intensity ?? 0,
      type: visitRecord.currentPain?.type,
      duration: visitRecord.currentPain?.duration ?? "",
      toothRef: visitRecord.currentPain?.toothRef,
    });

    // Sync exam findings only on first load (guard against overwriting local edits)
    if (!examFindingsInitialized.current) {
      setLocalExamFindings(visitRecord.examFindings ?? {});
      examFindingsInitialized.current = true;
    }
  }, [visitRecord]);

  // ─── Subscribe to odontogram store for ICDAS suggestions ──────────────────
  useEffect(() => {
    // The odontogram store's activeStoreApi is set during render (before effects run)
    // by OdontogramStoreProvider inside PatientOdontogramPanel (rendered as sibling).
    // Wrap in try/catch in case the panel hasn't mounted (e.g. no active appointment).
    let unsub: (() => void) | undefined;

    try {
      const currentState = useOdontogramStore.getState();
      setIcdasSuggestions(computeIcdasSuggestions(currentState.clinicalEvents ?? []));

      unsub = useOdontogramStore.subscribe((state) => {
        setIcdasSuggestions(computeIcdasSuggestions(state.clinicalEvents ?? []));
      });
    } catch {
      // Odontogram store not available — suggestions remain empty
    }

    return () => {
      unsub?.();
    };
  }, []);

  // ─── Cleanup debounces on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (painDebounceRef.current) clearTimeout(painDebounceRef.current);
      if (examDebounceRef.current) clearTimeout(examDebounceRef.current);
    };
  }, []);

  // ─── Pain save (debounced 800 ms, single object) ───────────────────────────
  const schedulePainSave = useCallback(
    (p: PainState) => {
      if (painDebounceRef.current) clearTimeout(painDebounceRef.current);
      painDebounceRef.current = setTimeout(() => {
        void saveVisitRecord(
          {
            currentPain: {
              location: p.location || undefined,
              intensity: p.intensity,
              type: p.type || undefined,
              duration: p.duration || undefined,
              toothRef: p.toothRef,
            },
          },
          { silent: true },
        );
      }, PAIN_DEBOUNCE_MS);
    },
    [saveVisitRecord],
  );

  const updatePain = useCallback(
    (patch: Partial<PainState>) => {
      setPain((prev) => {
        const next = { ...prev, ...patch };
        schedulePainSave(next);
        return next;
      });
    },
    [schedulePainSave],
  );

  // ─── Exam findings save (debounced 1200 ms) ────────────────────────────────
  const scheduleExamSave = useCallback(
    (findings: ExamFindings) => {
      if (examDebounceRef.current) clearTimeout(examDebounceRef.current);
      examDebounceRef.current = setTimeout(() => {
        void saveExamFindings(findings);
      }, EXAM_DEBOUNCE_MS);
    },
    [saveExamFindings],
  );

  // ─── Pain handlers ─────────────────────────────────────────────────────────

  const handlePainLocationChange = useCallback(
    (value: string) => updatePain({ location: value }),
    [updatePain],
  );

  const handlePainDurationChange = useCallback(
    (value: string) => updatePain({ duration: value }),
    [updatePain],
  );

  const handlePainIntensityChange = useCallback(
    (value: number) => updatePain({ intensity: value }),
    [updatePain],
  );

  const handlePainTypeChange = useCallback(
    (value?: string) => updatePain({ type: value }),
    [updatePain],
  );

  const handlePainToothRefChange = useCallback(
    (ref: ToothRef | null) => updatePain({ toothRef: ref ?? undefined }),
    [updatePain],
  );

  // ─── Chief complaint handlers ──────────────────────────────────────────────

  const handleChiefComplaintChange = useCallback((value: string) => {
    setChiefComplaint(value);
  }, []);

  const handleChiefComplaintBlur = useCallback(() => {
    void saveVisitRecord({ chiefComplaint }, { silent: true });
  }, [chiefComplaint, saveVisitRecord]);

  // ─── Diagnosis handlers ────────────────────────────────────────────────────

  const handleAddDiagnosis = useCallback(
    async (dx: VisitDiagnosis) => {
      // Skip exact duplicate (same code + toothRef.fdi)
      const isDuplicate = diagnoses.some(
        (d) => d.code === dx.code && (d.toothRef?.fdi ?? null) === (dx.toothRef?.fdi ?? null),
      );
      if (isDuplicate) return;
      await saveDiagnoses([...diagnoses, dx]);
    },
    [diagnoses, saveDiagnoses],
  );

  const handleRemoveDiagnosis = useCallback(
    async (index: number) => {
      const next = diagnoses.filter((_, i) => i !== index);
      await saveDiagnoses(next);
    },
    [diagnoses, saveDiagnoses],
  );

  const handleToggleDiagnosisStatus = useCallback(
    async (index: number) => {
      const next = diagnoses.map((d, i) =>
        i === index
          ? {
              ...d,
              status: (d.status === "provisional" ? "confirmed" : "provisional") as DiagnosisStatus,
            }
          : d,
      );
      await saveDiagnoses(next);
    },
    [diagnoses, saveDiagnoses],
  );

  // ─── Exam findings handlers ─────────────────────────────────────────────────

  const handleUpdateExtraoral = useCallback(
    (field: keyof ExamFindingsExtraoral, value: string) => {
      setLocalExamFindings((prev) => {
        const next: ExamFindings = {
          ...prev,
          extraoral: { ...prev.extraoral, [field]: value || undefined },
        };
        scheduleExamSave(next);
        return next;
      });
    },
    [scheduleExamSave],
  );

  const handleUpdateIntraoral = useCallback(
    (field: keyof ExamFindingsIntraoral, value: string) => {
      setLocalExamFindings((prev) => {
        const next: ExamFindings = {
          ...prev,
          intraoral: { ...prev.intraoral, [field]: value || undefined },
        };
        scheduleExamSave(next);
        return next;
      });
    },
    [scheduleExamSave],
  );

  // ─── Notes handler ──────────────────────────────────────────────────────────

  const handleSaveNotes = useCallback(
    async (html: string) => {
      await saveVisitNotes(html);
    },
    [saveVisitNotes],
  );

  // ─── Return ─────────────────────────────────────────────────────────────────

  return {
    // Record
    visitRecord,
    visitSaving,

    // Chief complaint
    chiefComplaint,
    handleChiefComplaintChange,
    handleChiefComplaintBlur,

    // Pain (consolidated single object)
    pain,
    painTypeOptions: PAIN_TYPE_OPTIONS,
    handlePainLocationChange,
    handlePainDurationChange,
    handlePainIntensityChange,
    handlePainTypeChange,
    handlePainToothRefChange,

    // Diagnoses
    diagnoses,
    icdasSuggestions,
    handleAddDiagnosis,
    handleRemoveDiagnosis,
    handleToggleDiagnosisStatus,

    // Exam findings
    localExamFindings,
    handleUpdateExtraoral,
    handleUpdateIntraoral,

    // Notes
    handleSaveNotes,
  };
}
