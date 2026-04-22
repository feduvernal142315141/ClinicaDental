"use client";

import { useState } from "react";
import { Badge } from "antd";
import { AlertTriangle, Edit } from "lucide-react";
import { MedicalHistoryDrawer } from "@/components/features/clinical-history/sections/MedicalHistoryDrawer";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { useClinicalNotes } from "@/lib/hooks/clinical-history";
import { TreatmentPlansPendingSection } from "./TreatmentPlansPendingSection";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
  AlertSeverity,
  UpdateMedicalHistoryRequest,
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
  onMedicalHistoryUpdated?: () => void;
  onSaveMedicalHistory?: (data: UpdateMedicalHistoryRequest) => Promise<void>;
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
  onMedicalHistoryUpdated,
  onSaveMedicalHistory,
  canEdit = false,
}: MedicalAntecedentsColumnProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const { saving, save } = useClinicalNotes(
    patientId,
    medicalHistory?.clinicalNotes,
  );

  const handleSaveDrawer = async (data: UpdateMedicalHistoryRequest) => {
    setDrawerLoading(true);
    try {
      if (onSaveMedicalHistory) {
        await onSaveMedicalHistory(data);
      }
      onMedicalHistoryUpdated?.();
      setDrawerOpen(false);
    } catch {
      // error handled upstream
    } finally {
      setDrawerLoading(false);
    }
  };

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
              onClick={() => setDrawerOpen(true)}
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
          Notas de historial
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

      <MedicalHistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveDrawer}
        medicalHistory={medicalHistory}
        loading={drawerLoading}
      />
    </div>
  );
}
