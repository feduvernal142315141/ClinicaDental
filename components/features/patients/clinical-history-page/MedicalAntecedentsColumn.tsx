"use client";

import { Badge } from "antd";
import { AlertTriangle, Edit } from "lucide-react";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { TreatmentPlansPendingSection } from "./TreatmentPlansPendingSection";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";
import { useMedicalAntecedentsColumn } from "@/lib/hooks/patients/clinical-history-page/use-medical-antecedents-column";

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
  activeAppointmentId: _activeAppointmentId,
  onEditClick,
  canEdit = false,
}: MedicalAntecedentsColumnProps) {
  const { saving, alertBadges, antecedentItems, handleSaveNotes } =
    useMedicalAntecedentsColumn({
      patientId,
      medicalHistory,
      patientHeader,
    });

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 gap-4">
      {/* Alertas — banner al tope */}
      {alertBadges.length > 0 && (
        <div className="py-3 rounded-md bg-rose-500/15 border border-rose-400/25 px-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
              Alertas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertBadges.map((alert) => (
              <Badge
                key={alert.id}
                status={alert.status}
                color={alert.color}
                text={alert.message}
              />
            ))}
          </div>
        </div>
      )}

      {/* Antecedentes */}
      <section className="bento p-6">
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
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-strong transition-colors whitespace-nowrap"
            >
              <Edit className="h-4 w-4" />
              Editar historia clínica
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {antecedentItems.map((item) => (
            <AntecedentItem
              key={item.label}
              label={item.label}
              items={item.items}
              empty={item.empty}
            />
          ))}
        </div>
      </section>

      {/* Planes pendientes */}
      <section className="bento overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Planes Pendientes
          </h3>
        </div>
        <div className="p-5">
          <TreatmentPlansPendingSection patientId={patientId} />
        </div>
      </section>

      {/* Notas de historial */}
      <section className="bento p-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Notas permanentes del paciente
        </h3>
        <ClinicalNotesEditor
          patientId={patientId}
          initialContent={medicalHistory?.clinicalNotes}
          updatedAt={medicalHistory?.clinicalNotesUpdatedAt}
          updatedBy={medicalHistory?.clinicalNotesUpdatedBy}
          readOnly={!canEdit}
          onSave={handleSaveNotes}
          saving={saving}
        />
      </section>
    </div>
  );
}
