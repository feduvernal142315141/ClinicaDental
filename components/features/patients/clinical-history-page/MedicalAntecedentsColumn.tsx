"use client";

import { AlertTriangle, Edit } from "lucide-react";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { TreatmentPlansPendingSection } from "./TreatmentPlansPendingSection";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";
import { useMedicalAntecedentsColumn } from "@/lib/hooks/patients/clinical-history-page/use-medical-antecedents-column";
import {
  useTreatmentPlansPendingSection,
  type TreatmentStatusCounts,
} from "@/lib/hooks/patients/clinical-history-page/use-treatment-plans-pending-section";

interface MedicalAntecedentsColumnProps {
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
  patientId: string;
  activeAppointmentId?: string;
  onEditClick?: () => void;
  canEdit?: boolean;
  /** Lleva a la pestaña Odontograma desde un plan de tratamiento. */
  onViewOdontogram?: () => void;
}

/** Resumen compacto de planes de tratamiento por estado de avance. */
function TreatmentStatusOverview({
  counts,
}: {
  counts: TreatmentStatusCounts;
}) {
  const items: { label: string; value: number; className: string }[] = [
    {
      label: "Pendientes",
      value: counts.pendiente,
      className:
        "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-300",
    },
    {
      label: "En curso",
      value: counts.enCurso,
      className:
        "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/25 dark:text-sky-300",
    },
    {
      label: "Completados",
      value: counts.completado,
      className:
        "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-300",
    },
  ];

  if (counts.total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
      {items.map((item) => (
        <Badge
          key={item.label}
          variant="outline"
          className={`gap-1 ${item.className}`}
        >
          <span className="font-bold tabular-nums">{item.value}</span>
          {item.label}
        </Badge>
      ))}
      {counts.cancelado > 0 && (
        <Badge
          variant="outline"
          className="gap-1 border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/25 dark:text-slate-300"
        >
          <span className="font-bold tabular-nums">{counts.cancelado}</span>
          Cancelados
        </Badge>
      )}
    </div>
  );
}

/** Mapea el color semántico de una alerta clínica a clases Tailwind con contraste WCAG AA. */
function alertBadgeClass(color: string): string {
  if (color === "red")
    return "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/25 dark:text-rose-300";
  if (color === "orange")
    return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-300";
  return "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/25 dark:text-sky-300";
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
  onEditClick,
  canEdit = false,
  onViewOdontogram,
}: MedicalAntecedentsColumnProps) {
  const { saving, alertBadges, antecedentItems, handleSaveNotes } =
    useMedicalAntecedentsColumn({
      patientId,
      medicalHistory,
      patientHeader,
    });

  // Planes de tratamiento: una sola carga alimenta el resumen y la lista.
  const {
    loading: plansLoading,
    pendingPlans,
    counts: planCounts,
  } = useTreatmentPlansPendingSection(patientId);

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
                className={alertBadgeClass(alert.color)}
              >
                {alert.message}
              </Badge>
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

      {/* Planes de tratamiento */}
      <section className="bento overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Planes de Tratamiento
          </h3>
        </div>
        {/* Resumen de estados (conteos por estado de avance) */}
        <TreatmentStatusOverview counts={planCounts} />
        <div className="p-5">
          <TreatmentPlansPendingSection
            plans={pendingPlans}
            loading={plansLoading}
            onViewOdontogram={onViewOdontogram}
          />
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
