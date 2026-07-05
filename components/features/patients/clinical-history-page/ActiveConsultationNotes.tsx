"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Activity,
  Stethoscope,
  NotebookPen,
} from "lucide-react";
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

/** Tarjeta de sección con header iconográfico consistente (lenguaje único). */
function Section({
  icon: Icon,
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  icon: LucideIcon;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-hairline bg-surface p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {meta && <div className="ml-auto flex items-center gap-2">{meta}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Etiqueta de campo legible y consistente. */
function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-subtle"
    >
      {children}
    </label>
  );
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
      ? "Guardando…"
      : autosaveStatus === "saved"
        ? "Guardado"
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
    <div className="h-full min-h-0 space-y-4 overflow-y-auto pr-2 pb-4">
      {/* ── Datos de esta consulta ─────────────────────────────────────── */}
      <Section
        icon={ClipboardList}
        title="Datos de esta consulta"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              En curso
            </span>
            <span
              aria-live="polite"
              aria-atomic="true"
              className="flex min-h-[16px] items-center"
            >
              {autosaveLabel && (
                <span
                  className={cn(
                    "text-[11px] tabular-nums transition-colors",
                    autosaveStatus === "saving" && "animate-pulse text-subtle",
                    autosaveStatus === "saved" &&
                      "text-emerald-600 dark:text-emerald-400",
                    autosaveStatus === "error" && "text-rose-500",
                  )}
                >
                  {autosaveStatus === "saved" ? "Guardado ✓" : autosaveLabel}
                </span>
              )}
            </span>
          </>
        }
      >
        {/* Motivo de consulta */}
        <div className="mb-4">
          <FieldLabel htmlFor="chief-complaint">Motivo de consulta</FieldLabel>
          <TextArea
            id="chief-complaint"
            rows={2}
            placeholder="Describe el motivo de la consulta…"
            value={chiefComplaint}
            onChange={(e) => handleChiefComplaintChange(e.target.value)}
            onBlur={handleChiefComplaintBlur}
            disabled={!canEdit}
          />
        </div>

        {/* Dolor actual */}
        <div className="rounded-xl border border-hairline bg-elevated p-3">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-subtle" />
            <span className="text-xs font-semibold text-ink">Dolor actual</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            <div>
              <FieldLabel htmlFor="pain-location">Ubicación</FieldLabel>
              <Input
                id="pain-location"
                placeholder="Ej. molar inferior derecho"
                value={pain.location}
                onChange={(e) => handlePainLocationChange(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div>
              <FieldLabel htmlFor="pain-duration">Duración</FieldLabel>
              <Input
                id="pain-duration"
                placeholder="Ej. 2 días"
                value={pain.duration}
                onChange={(e) => handlePainDurationChange(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div>
              <FieldLabel htmlFor="pain-intensity">
                Intensidad{" "}
                <span className="font-semibold text-ink tabular-nums">
                  {pain.intensity}/10
                </span>
              </FieldLabel>
              <div className="flex h-9 items-center">
                <Slider
                  id="pain-intensity"
                  min={0}
                  max={10}
                  step={1}
                  value={[pain.intensity]}
                  onValueChange={(vals) => handlePainIntensityChange(vals[0] ?? 0)}
                  disabled={!canEdit}
                  aria-label={`Intensidad del dolor: ${pain.intensity} de 10`}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={pain.intensity}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Tipo</FieldLabel>
              <Select
                value={pain.type ?? ""}
                onChange={(v) => handlePainTypeChange(v === "" ? undefined : v)}
                options={painTypeSelectOptions}
                placeholder="Tipo de dolor"
                disabled={!canEdit}
                aria-label="Tipo de dolor"
              />
            </div>

            <div className="col-span-2">
              <FieldLabel>Diente afectado (referencia FDI)</FieldLabel>
              <FdiToothPicker
                value={pain.toothRef}
                onChange={handlePainToothRefChange}
                disabled={!canEdit}
                placeholder="Seleccionar diente / cara…"
              />
              {pain.toothRef && (
                <p className="mt-1.5 text-[11px] text-subtle">
                  Diente {pain.toothRef.fdi}
                  {pain.toothRef.surface ? ` — ${pain.toothRef.surface}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Diagnóstico CIE-10 ─────────────────────────────────────────── */}
      <Section icon={Stethoscope} title="Diagnóstico CIE-10">
        <Cie10DiagnosisPicker
          diagnoses={diagnoses}
          icdasSuggestions={icdasSuggestions}
          onAdd={handleAddDiagnosis}
          onRemove={handleRemoveDiagnosis}
          onToggleStatus={handleToggleDiagnosisStatus}
          disabled={!canEdit}
        />
      </Section>

      {/* ── Hallazgos del examen ───────────────────────────────────────── */}
      <ExamFindingsSection
        findings={localExamFindings}
        onUpdateExtraoral={handleUpdateExtraoral}
        onUpdateIntraoral={handleUpdateIntraoral}
        disabled={!canEdit}
      />

      {/* ── Notas de esta consulta ─────────────────────────────────────── */}
      <Section icon={NotebookPen} title="Notas de esta consulta">
        <ClinicalNotesEditor
          patientId={patientId}
          initialContent={visitRecord?.clinicalNotes}
          updatedAt={visitRecord?.clinicalNotesUpdatedAt}
          updatedBy={visitRecord?.clinicalNotesUpdatedBy}
          readOnly={!canEdit}
          onSave={handleSaveNotes}
          saving={visitSaving}
        />
      </Section>

      {/* ── Lista para finalizar (informativa, no bloqueante) ──────────── */}
      <ReadinessChecklist
        diagnoses={diagnoses}
        examFindings={localExamFindings}
        hasNotes={hasNotes}
        chiefComplaint={chiefComplaint}
      />
    </div>
  );
}
