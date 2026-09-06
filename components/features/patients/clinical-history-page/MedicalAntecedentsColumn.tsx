"use client";

import { AlertCircle, AlertTriangle, Pencil, Shield } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { SECTION_LABEL_CLASS } from "./section-label";
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
  /** El backend devolvió 403 al pedir la historia clínica. */
  forbidden?: boolean;
  /** Falló la carga de la historia clínica (5xx, red). */
  loadError?: string | null;
  /** Reintenta la carga tras un fallo transitorio. */
  onRetry?: () => void;
}

/**
 * Fila de contadores de planes de tratamiento por estado de avance.
 *
 * Los tres números NO son decorativos: dicen cuánto trabajo hay abierto sobre
 * el paciente. Por eso, si la lectura falló (403/5xx/red), se pinta "—" y no
 * "0": un cero es una afirmación —"este paciente no tiene nada pendiente"— y
 * no se puede afirmar lo que no se ha podido leer.
 */
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
        <section key={item.label} className="bento px-3 py-2.5">
          <p className={SECTION_LABEL_CLASS}>{item.label}</p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-bold leading-none tabular-nums",
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

/** Una celda de la rejilla de antecedentes. */
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
  /** Color del valor cuando SÍ hay dato (rojo en alergias, ámbar en enfermedades). */
  valueClassName?: string;
  withWarningIcon?: boolean;
}) {
  const hasItems = Boolean(items?.length);

  return (
    <div>
      <p className={cn(SECTION_LABEL_CLASS, "mb-0.5")}>{label}</p>
      {hasItems ? (
        <p
          className={cn(
            "flex items-start gap-1 text-xs font-medium",
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
        <p className="text-xs italic text-subtle">{empty}</p>
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
  const { alertBadges } = useMedicalAntecedentsColumn({
    patientId,
    medicalHistory,
    patientHeader,
  });

  // Planes de tratamiento: una sola carga alimenta los contadores y la lista.
  const {
    loading: plansLoading,
    loadFailed: plansLoadFailed,
    counts: planCounts,
  } = useTreatmentPlansPendingSection(patientId);

  // Un fallo de lectura NUNCA puede renderizarse como dato clínico ausente. Sin
  // este corte, un 403 dejaba `snapshot` en null y la columna afirmaba "Sin
  // alergias registradas" sobre un paciente cuyos antecedentes no se han podido
  // leer: una afirmación médica falsa nacida de un problema de permisos.
  if (forbidden || loadError) {
    return (
      <div className="flex flex-col px-4 gap-4">
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

      {/* Contadores de planes — fuera de cualquier tarjeta contenedora */}
      <TreatmentStatusCounters
        counts={planCounts}
        loading={plansLoading}
        loadFailed={plansLoadFailed}
      />

      {/* Antecedentes médicos */}
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
              className="h-7 w-7 text-subtle hover:text-brand"
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
            valueClassName="text-rose-600 dark:text-rose-400"
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
            valueClassName="text-amber-700 dark:text-amber-400"
          />
        </div>
      </section>

    </div>
  );
}
