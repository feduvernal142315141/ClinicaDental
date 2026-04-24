"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Badge, Input, Slider, Select } from "antd";
import { AlertTriangle, Edit } from "lucide-react";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { useClinicalNotes, useVisitRecord } from "@/lib/hooks/clinical-history";
import { TreatmentPlansPendingSection } from "./TreatmentPlansPendingSection";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
  AlertSeverity,
} from "@/lib/entity/clinical-history";
import { ALERT_SEVERITY_COLORS } from "@/lib/entity/clinical-history";

const SEVERITY_BADGE_STATUS: Record<
  AlertSeverity,
  "error" | "warning" | "processing"
> = {
  critical: "error",
  warning: "warning",
  info: "processing",
};

interface MedicalAntecedentsColumnProps {
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
  patientId: string;
  activeAppointmentId?: string;
  onEditClick?: () => void;
  canEdit?: boolean;
}

function AntecedentItem({
  label,
  items,
  empty,
}: {
  label: string;
  items?: string[];
  empty: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </label>
      <p className="text-sm text-foreground">
        {items?.length ? items.join(", ") : empty}
      </p>
    </div>
  );
}

export function MedicalAntecedentsColumn({
  medicalHistory,
  patientHeader,
  patientId,
  activeAppointmentId,
  onEditClick,
  canEdit = false,
}: MedicalAntecedentsColumnProps) {
  const { saving, save } = useClinicalNotes(
    patientId,
    medicalHistory?.clinicalNotes,
  );
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

  const alerts = patientHeader?.alerts ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 gap-4">
      {/* Alertas — banner al tope */}
      {alerts.length > 0 && (
        <div className="py-3 rounded-md bg-red-50 border border-red-200 px-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
              Alertas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <Badge
                key={alert.id}
                status={SEVERITY_BADGE_STATUS[alert.severity]}
                color={ALERT_SEVERITY_COLORS[alert.severity]}
                text={alert.message}
              />
            ))}
          </div>
        </div>
      )}

      {/* Antecedentes */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Antecedentes Médicos
            </h3>
            <p className="text-xs text-muted-foreground">
              Información general y clínica del paciente
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => onEditClick?.()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Edit className="h-4 w-4" />
              Editar historia clínica
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AntecedentItem
            label="Alergias"
            items={medicalHistory?.allergies}
            empty="Sin alergias registradas"
          />
          <AntecedentItem
            label="Medicamentos actuales"
            items={medicalHistory?.currentMedications}
            empty="Sin medicamentos registrados"
          />
          <AntecedentItem
            label="Cirugías previas"
            items={medicalHistory?.previousSurgeries}
            empty="Sin cirugías registradas"
          />
          <AntecedentItem
            label="Enfermedades sistémicas"
            items={medicalHistory?.systemicDiseases}
            empty="Sin enfermedades sistémicas registradas"
          />
        </div>
      </section>

      {/* Planes pendientes */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Planes Pendientes
          </h3>
        </div>
        <div className="p-5">
          <TreatmentPlansPendingSection patientId={patientId} />
        </div>
      </section>

      {/* Notas de historial */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Notas permanentes del paciente
        </h3>
        <ClinicalNotesEditor
          patientId={patientId}
          initialContent={medicalHistory?.clinicalNotes}
          updatedAt={medicalHistory?.clinicalNotesUpdatedAt}
          updatedBy={medicalHistory?.clinicalNotesUpdatedBy}
          readOnly={!canEdit}
          onSave={async (html) => {
            await save(html);
          }}
          saving={saving}
        />
      </section>

      {/* Datos de esta consulta + Notas — solo si hay consulta activa */}
      {activeAppointmentId && (
        <>
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

          <section className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Notas de esta consulta
              </h3>
            </div>
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
          </section>
        </>
      )}

    </div>
  );
}
