"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useVisitRecord } from "@/lib/hooks/clinical-history";

const PAIN_TYPE_OPTIONS = [
  { value: "agudo", label: "Agudo" },
  { value: "pulsátil", label: "Pulsátil" },
  { value: "sordo", label: "Sordo" },
  { value: "punzante", label: "Punzante" },
  { value: "intermitente", label: "Intermitente" },
  { value: "constante", label: "Constante" },
];

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
  } = useVisitRecord(patientId, activeAppointmentId);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [painLocation, setPainLocation] = useState("");
  const [painIntensity, setPainIntensity] = useState<number>(0);
  const [painType, setPainType] = useState<string | undefined>(undefined);
  const [painDuration, setPainDuration] = useState("");

  useEffect(() => {
    if (!visitRecord) return;

    setChiefComplaint(visitRecord.chiefComplaint ?? "");
    setPainLocation(visitRecord.currentPain?.location ?? "");
    setPainIntensity(visitRecord.currentPain?.intensity ?? 0);
    setPainType(visitRecord.currentPain?.type ?? undefined);
    setPainDuration(visitRecord.currentPain?.duration ?? "");
  }, [visitRecord]);

  const painDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePainSave = useCallback(
    (pain: {
      location?: string;
      intensity?: number;
      type?: string;
      duration?: string;
    }) => {
      if (painDebounceRef.current) {
        clearTimeout(painDebounceRef.current);
      }

      painDebounceRef.current = setTimeout(() => {
        void saveVisitRecord({ currentPain: pain }, { silent: true });
      }, 800);
    },
    [saveVisitRecord],
  );

  useEffect(() => {
    return () => {
      if (painDebounceRef.current) {
        clearTimeout(painDebounceRef.current);
      }
    };
  }, []);

  const handleChiefComplaintChange = useCallback((value: string) => {
    setChiefComplaint(value);
  }, []);

  const handleChiefComplaintBlur = useCallback(() => {
    void saveVisitRecord({ chiefComplaint }, { silent: true });
  }, [chiefComplaint, saveVisitRecord]);

  const handlePainLocationChange = useCallback(
    (value: string) => {
      setPainLocation(value);
      schedulePainSave({
        location: value,
        intensity: painIntensity,
        type: painType,
        duration: painDuration,
      });
    },
    [painDuration, painIntensity, painType, schedulePainSave],
  );

  const handlePainDurationChange = useCallback(
    (value: string) => {
      setPainDuration(value);
      schedulePainSave({
        location: painLocation,
        intensity: painIntensity,
        type: painType,
        duration: value,
      });
    },
    [painLocation, painIntensity, painType, schedulePainSave],
  );

  const handlePainIntensityChange = useCallback(
    (value: number) => {
      setPainIntensity(value);
      schedulePainSave({
        location: painLocation,
        intensity: value,
        type: painType,
        duration: painDuration,
      });
    },
    [painDuration, painLocation, painType, schedulePainSave],
  );

  const handlePainTypeChange = useCallback(
    (value?: string) => {
      setPainType(value);
      schedulePainSave({
        location: painLocation,
        intensity: painIntensity,
        type: value,
        duration: painDuration,
      });
    },
    [painDuration, painIntensity, painLocation, schedulePainSave],
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
    painLocation,
    painIntensity,
    painType,
    painDuration,
    painTypeOptions: PAIN_TYPE_OPTIONS,
    handleChiefComplaintChange,
    handleChiefComplaintBlur,
    handlePainLocationChange,
    handlePainDurationChange,
    handlePainIntensityChange,
    handlePainTypeChange,
    handleSaveNotes,
  };
}
