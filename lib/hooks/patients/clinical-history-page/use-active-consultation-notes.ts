"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  projectToCanonicalSurface,
  type CanonicalSurface,
} from "@/lib/odontogram/domain/odontogram/types/surface.types";
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
const PAIN_TYPE_OPTIONS = [
  { value: "agudo", label: "Agudo" },
  { value: "pulsátil", label: "Pulsátil" },
  { value: "sordo", label: "Sordo" },
  { value: "punzante", label: "Punzante" },
  { value: "intermitente", label: "Intermitente" },
  { value: "constante", label: "Constante" },
];

const CANONICAL_SURFACE_LETTER: Record<CanonicalSurface, string> = {
  mesial: "M",
  distal: "D",
  facial: "F",
  lingual: "L",
  oclusal: "O",
};
const PAIN_DEBOUNCE_MS = 800;
const EXAM_DEBOUNCE_MS = 1200;
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
    const cell = ev.surfaces?.[0];
    const surface = cell
      ? CANONICAL_SURFACE_LETTER[projectToCanonicalSurface(cell)]
      : undefined;
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

  const [chiefComplaint, setChiefComplaint] = useState("");

  const [pain, setPain] = useState<PainState>({
    location: "",
    intensity: 0,
    type: undefined,
    duration: "",
    toothRef: undefined,
  });
  const [localExamFindings, setLocalExamFindings] = useState<ExamFindings>({});
  const examFindingsInitialized = useRef(false);
  const [icdasSuggestions, setIcdasSuggestions] = useState<VisitDiagnosis[]>([]);

  const painDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!examFindingsInitialized.current) {
      setLocalExamFindings(visitRecord.examFindings ?? {});
      examFindingsInitialized.current = true;
    }
  }, [visitRecord]);
  useEffect(() => {

    let unsub: (() => void) | undefined;
    const acceptIfSamePatient = (state: {
      clinicalEvents?: unknown[];
      metadata?: { patientId?: string };
    }) => {
      if (state.metadata?.patientId && state.metadata.patientId !== patientId) {
        setIcdasSuggestions([]);
        return;
      }
      setIcdasSuggestions(
        computeIcdasSuggestions(
          (state.clinicalEvents ?? []) as Parameters<
            typeof computeIcdasSuggestions
          >[0],
        ),
      );
    };
    try {
      acceptIfSamePatient(useOdontogramStore.getState());
      unsub = useOdontogramStore.subscribe(acceptIfSamePatient);
    } catch {
      setIcdasSuggestions([]);
    }
    return () => {
      unsub?.();
    };
  }, [patientId]);
  useEffect(() => {
    return () => {
      if (painDebounceRef.current) clearTimeout(painDebounceRef.current);
      if (examDebounceRef.current) clearTimeout(examDebounceRef.current);
    };
  }, []);
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
  const scheduleExamSave = useCallback(
    (findings: ExamFindings) => {
      if (examDebounceRef.current) clearTimeout(examDebounceRef.current);
      examDebounceRef.current = setTimeout(() => {
        void saveExamFindings(findings);
      }, EXAM_DEBOUNCE_MS);
    },
    [saveExamFindings],
  );
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
  const handleChiefComplaintChange = useCallback((value: string) => {
    setChiefComplaint(value);
  }, []);
  const handleChiefComplaintBlur = useCallback(() => {
    void saveVisitRecord({ chiefComplaint }, { silent: true });
  }, [chiefComplaint, saveVisitRecord]);
  const handleAddDiagnosis = useCallback(
    async (dx: VisitDiagnosis) => {
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
  const handleSaveNotes = useCallback(
    async (html: string) => {
      await saveVisitNotes(html);
    },
    [saveVisitNotes],
  );
  return {
    visitRecord,
    visitSaving,
    chiefComplaint,
    handleChiefComplaintChange,
    handleChiefComplaintBlur,

    pain,
    painTypeOptions: PAIN_TYPE_OPTIONS,
    handlePainLocationChange,
    handlePainDurationChange,
    handlePainIntensityChange,
    handlePainTypeChange,
    handlePainToothRefChange,

    diagnoses,
    icdasSuggestions,
    handleAddDiagnosis,
    handleRemoveDiagnosis,
    handleToggleDiagnosisStatus,
    localExamFindings,
    handleUpdateExtraoral,
    handleUpdateIntraoral,
    handleSaveNotes,
  };
}
