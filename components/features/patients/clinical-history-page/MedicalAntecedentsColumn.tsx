"use client";

import {
  AlertCircle,
  AlertTriangle,
  NotebookText,
  Pencil,
  Shield,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { NO_AUTHORSHIP_LABEL } from "@/lib/utils/clinical-authorship";
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
  forbidden?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

function TreatmentStatusCounters({
  counts,
  loading,
  loadFailed,
}: {
  counts: TreatmentStatusCounts;
  loading: boolean;
  loadFailed: boolean;
}) {
  const unknown = loadFailed || loading;
  const unknownTitle = loadFailed
    ? "No se pudieron leer los planes de tratamiento de este paciente. El recuento no se está mostrando."
    : "Cargando los planes de tratamiento…";
  const items: { label: string; value: number; className: string }[] = [
    {
      label: "Pendiente",
      value: counts.pendiente,
      className: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "En curso",
      value: counts.enCurso,
      className: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Completado",
      value: counts.completado,
      className: "text-emerald-600 dark:text-emerald-400",
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((item) => (
        <section
          key={item.label}
          className="rounded-xl border border-hairline bg-surface px-3 py-2.5"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold leading-none tabular-nums",
              unknown ? "text-subtle" : item.className,
            )}
            title={unknown ? unknownTitle : undefined}
          >
            {unknown ? "—" : item.value}
          </p>
        </section>
      ))}
    </div>
  );
}
const ALERT_TONE: Record<string, StatusBadgeTone> = {
  red: "danger",
  orange: "warning",

  blue: "progress",
};
function AntecedentCell({
  label,
  items,
  empty,
  valueClassName,
  withWarningIcon = false,
}: {
  label: string;
  items?: string[];
  empty: string;
  valueClassName?: string;
  withWarningIcon?: boolean;
}) {
  const hasItems = Boolean(items?.length);
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-subtle/80">
        {label}
      </p>
      {hasItems ? (
        <p
          className={cn(
            "flex items-start gap-1 text-xs",
            valueClassName ?? "text-ink",
          )}
        >
          {withWarningIcon && (
            <AlertCircle
              className="mt-0.5 h-3 w-3 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>{items?.join(", ")}</span>
        </p>
      ) : (
        <p className="text-xs font-normal text-subtle/70">{empty}</p>
      )}
    </div>
  );
}
export function MedicalAntecedentsColumn({
  medicalHistory,
  patientHeader,
  patientId,
  onEditClick,
  canEdit = false,
  forbidden = false,
  loadError = null,
  onRetry,
}: MedicalAntecedentsColumnProps) {
  const { alertBadges, clinicalNote } = useMedicalAntecedentsColumn({
    medicalHistory,
    patientHeader,
  });
  const {
    loading: plansLoading,
    loadFailed: plansLoadFailed,
    counts: planCounts,
  } = useTreatmentPlansPendingSection(patientId);
  if (forbidden || loadError) {
    return (
      <div className="flex flex-col gap-4">
        <Alert live={false} className="mt-3">
          <AlertTriangle />
          <AlertTitle>
            {forbidden
              ? "Sin acceso a los antecedentes"
              : "No se pudieron cargar los antecedentes"}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              {forbidden
                ? "Tu rol no permite ver la historia clínica de este paciente. Lo que no se muestra aquí no significa que el paciente no tenga antecedentes."
                : "No hemos podido leer la historia clínica. No se está mostrando información médica de este paciente."}
            </span>
            {!forbidden && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {alertBadges.length > 0 && (
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
      <TreatmentStatusCounters
        counts={planCounts}
        loading={plansLoading}
        loadFailed={plansLoadFailed}
      />
      <section className="bento shrink-0 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-ink">
              Antecedentes Médicos
            </h3>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-subtle hover:bg-hover hover:text-brand"
              onClick={() => onEditClick?.()}
              aria-label="Editar antecedentes médicos"
              title="Editar antecedentes médicos"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <AntecedentCell
            label="Alergias"
            items={medicalHistory?.allergies}
            empty="Sin alergias registradas"
            valueClassName="font-semibold text-rose-600 dark:text-rose-400"
            withWarningIcon
          />
          <AntecedentCell
            label="Medicamentos"
            items={medicalHistory?.currentMedications}
            empty="Ninguno"
          />
          <AntecedentCell
            label="Cirugías"
            items={medicalHistory?.previousSurgeries}
            empty="Ninguna"
          />
          <AntecedentCell
            label="Enfermedades"
            items={medicalHistory?.systemicDiseases}
            empty="Ninguna"
            valueClassName="font-medium text-amber-700 dark:text-amber-400"
          />
        </div>
      </section>
      <section className="bento shrink-0 p-4">
        <div className="mb-3 flex items-center gap-2">
          <NotebookText className="h-4 w-4 text-brand" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink">Notas permanentes</h3>
        </div>
        {clinicalNote.kind === "no-record" ? (
          <p className="text-xs text-subtle/70">
            Este paciente todavía no tiene historia clínica registrada, así que
            no hay notas permanentes que mostrar.
          </p>
        ) : clinicalNote.kind === "empty" ? (
          <p className="text-xs text-subtle/70">
            La historia clínica está registrada y no tiene ninguna nota
            permanente.
          </p>
        ) : (
          <>
            <div
              className="prose prose-sm max-w-none text-ink dark:prose-invert [overflow-wrap:anywhere] [&_table]:block [&_table]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: clinicalNote.html }}
            />
            <div className="mt-3 border-t border-hairline pt-2 text-[11px] text-subtle">
              {clinicalNote.author ? (
                <span>
                  Última edición:{" "}
                  <span className="text-ink">{clinicalNote.author}</span>
                  {clinicalNote.editedAt ? ` · ${clinicalNote.editedAt}` : null}
                </span>
              ) : (
                <span>
                  <span className="italic">{NO_AUTHORSHIP_LABEL}</span>
                  {clinicalNote.editedAt
                    ? ` · Última edición: ${clinicalNote.editedAt}`
                    : null}
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
