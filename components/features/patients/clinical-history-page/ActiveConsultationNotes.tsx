"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Input, Slider, Select } from "antd";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { useVisitRecord } from "@/lib/hooks/clinical-history";

interface ActiveConsultationNotesProps {
  patientId: string;
  activeAppointmentId: string;
  canEdit?: boolean;
}

export function ActiveConsultationNotes({
  patientId,
  activeAppointmentId,
  canEdit = false,
}: ActiveConsultationNotesProps) {
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
    if (visitRecord) {
      setChiefComplaint(visitRecord.chiefComplaint ?? "");
      setPainLocation(visitRecord.currentPain?.location ?? "");
      setPainIntensity(visitRecord.currentPain?.intensity ?? 0);
      setPainType(visitRecord.currentPain?.type ?? undefined);
      setPainDuration(visitRecord.currentPain?.duration ?? "");
    }
  }, [visitRecord]);

  const painDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePainSave = useCallback(
    (pain: { location?: string; intensity?: number; type?: string; duration?: string }) => {
      if (painDebounceRef.current) clearTimeout(painDebounceRef.current);
      painDebounceRef.current = setTimeout(() => {
        void saveVisitRecord({ currentPain: pain }, { silent: true });
      }, 800);
    },
    [saveVisitRecord],
  );

  useEffect(() => {
    return () => {
      if (painDebounceRef.current) clearTimeout(painDebounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-2">
      <section className="bg-blue-50 rounded-xl border border-blue-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Datos de esta consulta
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            En curso
          </span>
        </div>

        {/* Motivo de consulta */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Motivo de consulta
          </label>
          <Input.TextArea
            rows={2}
            placeholder="Describe el motivo de la consulta..."
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            onBlur={() =>
              void saveVisitRecord(
                { chiefComplaint: chiefComplaint },
                { silent: true },
              )
            }
            disabled={!canEdit}
          />
        </div>

        {/* Dolor actual */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            Dolor actual
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ubicación</label>
              <Input
                placeholder="Ej. molar inferior derecho"
                value={painLocation}
                onChange={(e) => {
                  setPainLocation(e.target.value);
                  schedulePainSave({
                    location: e.target.value,
                    intensity: painIntensity,
                    type: painType,
                    duration: painDuration,
                  });
                }}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duración</label>
              <Input
                placeholder="Ej. 2 días"
                value={painDuration}
                onChange={(e) => {
                  setPainDuration(e.target.value);
                  schedulePainSave({
                    location: painLocation,
                    intensity: painIntensity,
                    type: painType,
                    duration: e.target.value,
                  });
                }}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Intensidad ({painIntensity}/10)
              </label>
              <Slider
                min={0}
                max={10}
                value={painIntensity}
                onChange={(val) => {
                  setPainIntensity(val);
                  schedulePainSave({
                    location: painLocation,
                    intensity: val,
                    type: painType,
                    duration: painDuration,
                  });
                }}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select
                className="w-full"
                placeholder="Tipo de dolor"
                value={painType}
                allowClear
                onChange={(val) => {
                  setPainType(val);
                  schedulePainSave({
                    location: painLocation,
                    intensity: painIntensity,
                    type: val,
                    duration: painDuration,
                  });
                }}
                disabled={!canEdit}
                options={[
                  { value: "agudo", label: "Agudo" },
                  { value: "pulsátil", label: "Pulsátil" },
                  { value: "sordo", label: "Sordo" },
                  { value: "punzante", label: "Punzante" },
                  { value: "intermitente", label: "Intermitente" },
                  { value: "constante", label: "Constante" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-green-200 shadow-sm p-6 flex-1 flex flex-col min-h-[300px]">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Notas de esta consulta
          </h3>
        </div>
        <div className="flex-1">
          <ClinicalNotesEditor
            patientId={patientId}
            initialContent={visitRecord?.clinicalNotes}
            updatedAt={visitRecord?.clinicalNotesUpdatedAt}
            updatedBy={visitRecord?.clinicalNotesUpdatedBy}
            readOnly={!canEdit}
            onSave={async (html) => {
              await saveVisitNotes(html);
            }}
            saving={visitSaving}
          />
        </div>
      </section>
    </div>
  );
}
