"use client";

import { Input, Slider, Select } from "antd";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { useActiveConsultationNotes } from "@/lib/hooks/patients/clinical-history-page/use-active-consultation-notes";

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
    visitRecord,
    visitSaving,
    chiefComplaint,
    painLocation,
    painIntensity,
    painType,
    painDuration,
    painTypeOptions,
    handleChiefComplaintChange,
    handleChiefComplaintBlur,
    handlePainLocationChange,
    handlePainDurationChange,
    handlePainIntensityChange,
    handlePainTypeChange,
    handleSaveNotes,
  } = useActiveConsultationNotes({ patientId, activeAppointmentId });

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
            onChange={(e) => handleChiefComplaintChange(e.target.value)}
            onBlur={handleChiefComplaintBlur}
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
              <label className="text-xs text-muted-foreground mb-1 block">
                Ubicación
              </label>
              <Input
                placeholder="Ej. molar inferior derecho"
                value={painLocation}
                onChange={(e) => handlePainLocationChange(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Duración
              </label>
              <Input
                placeholder="Ej. 2 días"
                value={painDuration}
                onChange={(e) => handlePainDurationChange(e.target.value)}
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
                onChange={handlePainIntensityChange}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tipo
              </label>
              <Select
                className="w-full"
                placeholder="Tipo de dolor"
                value={painType}
                allowClear
                onChange={handlePainTypeChange}
                disabled={!canEdit}
                options={painTypeOptions}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-green-200 shadow-sm p-6 flex-1 flex flex-col min-h-75">
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
            onSave={handleSaveNotes}
            saving={visitSaving}
          />
        </div>
      </section>
    </div>
  );
}
