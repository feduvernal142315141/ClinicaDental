"use client";

import { cn } from "@/lib/utils/utils";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { Input } from "@/components/ui/atomic/forms";
import { Slider } from "@/components/ui/atomic/forms/slider";
import { Select } from "@/components/ui/controls/select";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { Cie10DiagnosisPicker } from "@/components/features/clinical-history/Cie10DiagnosisPicker";
import { ExamFindingsSection } from "@/components/features/clinical-history/ExamFindingsSection";
import { FdiToothPicker } from "@/components/features/clinical-history/FdiToothPicker";
import { ReadinessChecklist } from "@/components/features/clinical-history/ReadinessChecklist";
import { useActiveConsultationNotes } from "@/lib/hooks/patients/clinical-history-page/use-active-consultation-notes";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";

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
    pain,
    painTypeOptions,
    handleChiefComplaintChange,
    handleChiefComplaintBlur,
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
  } = useActiveConsultationNotes({ patientId, activeAppointmentId });

  const { status: autosaveStatus } = useAutosaveStatus();

  const autosaveLabel =
    autosaveStatus === "saving"
      ? "Guardando..."
      : autosaveStatus === "saved"
        ? "Guardado ✓"
        : autosaveStatus === "error"
          ? "Error al guardar"
          : null;

  /** Opciones de tipo de dolor con opción vacía para limpiar. */
  const painTypeSelectOptions = [
    { value: "", label: "Sin tipo" },
    ...painTypeOptions,
  ];

  const hasNotes = Boolean(visitRecord?.clinicalNotes?.trim());

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-2">

      {/* ── Sección: Datos de esta consulta ──────────────────────────────── */}
      <section className="bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Datos de esta consulta
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              En curso
            </span>
          </div>

          {/* Indicador de autoguardado — aria-live para lectores de pantalla */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="min-h-[14px] flex items-center"
          >
            {autosaveLabel && (
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  autosaveStatus === "saving" &&
                    "text-muted-foreground animate-pulse",
                  autosaveStatus === "saved" &&
                    "text-emerald-600 dark:text-emerald-400",
                  autosaveStatus === "error" && "text-destructive",
                )}
              >
                {autosaveLabel}
              </span>
            )}
          </div>
        </div>

        {/* Motivo de consulta */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Motivo de consulta
          </label>
          <TextArea
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
            {/* Ubicación textual */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Ubicación
              </label>
              <Input
                placeholder="Ej. molar inferior derecho"
                value={pain.location}
                onChange={(e) => handlePainLocationChange(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* Duración */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Duración
              </label>
              <Input
                placeholder="Ej. 2 días"
                value={pain.duration}
                onChange={(e) => handlePainDurationChange(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* Intensidad */}
            <div>
              <label
                htmlFor="pain-intensity"
                className="text-xs text-muted-foreground mb-1 block"
              >
                Intensidad ({pain.intensity}/10)
              </label>
              <Slider
                id="pain-intensity"
                min={0}
                max={10}
                step={1}
                value={[pain.intensity]}
                onValueChange={(vals) =>
                  handlePainIntensityChange(vals[0] ?? 0)
                }
                disabled={!canEdit}
                aria-label={`Intensidad del dolor: ${pain.intensity} de 10`}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={pain.intensity}
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tipo
              </label>
              <Select
                value={pain.type ?? ""}
                onChange={(v) =>
                  handlePainTypeChange(v === "" ? undefined : v)
                }
                options={painTypeSelectOptions}
                placeholder="Tipo de dolor"
                disabled={!canEdit}
                aria-label="Tipo de dolor"
              />
            </div>

            {/* Diente / cara anatómica (Fase D: dolor → diente FDI) */}
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Diente afectado (referencia FDI)
              </label>
              <FdiToothPicker
                value={pain.toothRef}
                onChange={handlePainToothRefChange}
                disabled={!canEdit}
                placeholder="Seleccionar diente / cara…"
              />
              {pain.toothRef && (
                <p className="mt-1 text-[10px] text-subtle">
                  Diente {pain.toothRef.fdi}
                  {pain.toothRef.surface ? ` — ${pain.toothRef.surface}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sección: Diagnóstico ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-hairline bg-surface shadow-sm p-4">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Diagnóstico CIE-10
        </h3>
        <Cie10DiagnosisPicker
          diagnoses={diagnoses}
          icdasSuggestions={icdasSuggestions}
          onAdd={handleAddDiagnosis}
          onRemove={handleRemoveDiagnosis}
          onToggleStatus={handleToggleDiagnosisStatus}
          disabled={!canEdit}
        />
      </section>

      {/* ── Sección: Hallazgos del examen ────────────────────────────────── */}
      <ExamFindingsSection
        findings={localExamFindings}
        onUpdateExtraoral={handleUpdateExtraoral}
        onUpdateIntraoral={handleUpdateIntraoral}
        disabled={!canEdit}
      />

      {/* ── Sección: Notas clínicas ──────────────────────────────────────── */}
      <section className="bg-white dark:bg-surface rounded-xl border border-green-200 dark:border-green-900 shadow-sm p-6 flex-1 flex flex-col min-h-75">
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

      {/* ── Lista para finalizar (visual hint, no bloqueante) ──────────── */}
      <ReadinessChecklist
        diagnoses={diagnoses}
        examFindings={localExamFindings}
        hasNotes={hasNotes}
        chiefComplaint={chiefComplaint}
      />
    </div>
  );
}
