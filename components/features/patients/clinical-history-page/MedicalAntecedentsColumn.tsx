"use client";

import { AlertTriangle, Edit } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { cn } from "@/lib/utils/utils";
import { SECTION_LABEL_CLASS } from "./section-label";
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
  const items: { label: string; value: number; tone: StatusBadgeTone }[] = [
    { label: "Pendientes", value: counts.pendiente, tone: "warning" },
    { label: "En curso", value: counts.enCurso, tone: "progress" },
    { label: "Completados", value: counts.completado, tone: "success" },
  ];

  // Los cancelados solo se listan cuando los hay (mismo criterio que antes).
  if (counts.cancelado > 0) {
    items.push({
      label: "Cancelados",
      value: counts.cancelado,
      tone: "neutral",
    });
  }

  if (counts.total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
      {items.map((item) => (
        <StatusBadge key={item.label} tone={item.tone} className="gap-1">
          <span className="font-bold tabular-nums">{item.value}</span>
          {item.label}
        </StatusBadge>
      ))}
    </div>
  );
}

/**
 * Color de la alerta clínica → tono del pill del sistema.
 *
 * Las claves siguen siendo el vocabulario antd (`red`/`orange`/`blue`) porque
 * es lo que emite `ALERT_SEVERITY_COLORS`, todavía consumido por el cluster
 * antd heredado. Aquí se traduce una sola vez a los tonos del sistema en lugar
 * de reescribir la paleta a mano.
 */
const ALERT_TONE: Record<string, StatusBadgeTone> = {
  red: "danger",
  orange: "warning",
  // `progress` (sky) y NO `info`: `info` es el color de MARCA, se lee como
  // elemento pulsable y es el único tono sin rampa `dark:` propia (depende de
  // que `--brand` invierta, y en oscuro se queda en ~4,1:1). `progress`
  // conserva la familia cromática original (sky) y sí trae `dark:text-sky-300`.
  blue: "progress",
};

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
      <label className={cn(SECTION_LABEL_CLASS, "block mb-1")}>{label}</label>
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
    <div className="flex flex-col px-4 gap-4">
      {/* Alertas — banner al tope */}
      {alertBadges.length > 0 && (
        // Contenedor NEUTRO a propósito: la severidad la lleva cada pill, que
        // ya viene en rojo/ámbar/azul. Un `variant="destructive"` sumaría su
        // tinte al del pill (dos capas al 15% sobre el mismo fondo) y hundiría
        // el texto ámbar a ~2,2:1, muy por debajo del mínimo AA — además de
        // pintar de rojo alertas que son informativas.
        <Alert live={false} className="mt-3">
          <AlertTriangle />
          <AlertTitle>Alertas</AlertTitle>
          <AlertDescription className="flex flex-row flex-wrap gap-2">
            {alertBadges.map((alert) => (
              <StatusBadge
                key={alert.id}
                tone={ALERT_TONE[alert.color] ?? "neutral"}
              >
                {alert.message}
              </StatusBadge>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Antecedentes */}
      <section className="bento shrink-0 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className={cn(SECTION_LABEL_CLASS, "mb-1")}>
              Antecedentes Médicos
            </h3>
            <p className="text-xs text-subtle">
              Información general y clínica del paciente
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => onEditClick?.()}>
              <Edit className="h-4 w-4" />
              Editar historia clínica
            </Button>
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
      {/* `shrink-0` es defensivo: si algún día se vuelve a acotar el alto de
          esta columna, sus hijos se comprimirían, y aquí `overflow-hidden`
          convertiría esa compresión en un RECORTE — que es como se cortaba la
          tarjeta del plan por abajo. Hoy la columna ya no limita el alto: la
          página entera es la única superficie que scrollea. */}
      <section className="bento shrink-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          {/* "Planes del odontograma" y no "Planes de Tratamiento": la ficha
              tiene ahora una pestaña propia con ESE nombre, y son dos cosas
              distintas —allí se ven las LÍNEAS presupuestadas con sus importes;
              aquí, los DOCUMENTOS de plan y su avance derivado de los eventos
              del odontograma, que es justo a donde lleva la acción de cada
              tarjeta. Dos rótulos iguales con contenidos distintos en la misma
              ficha mandan al usuario al sitio equivocado. */}
          <h3 className={SECTION_LABEL_CLASS}>Planes del odontograma</h3>
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
      <section className="bento shrink-0 p-6">
        <h3 className={cn(SECTION_LABEL_CLASS, "mb-4")}>
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
