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
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-subtle/80">
        {label}
      </p>
      {hasItems ? (
        <p
          className={cn(
            "flex items-start gap-1 text-xs",
            // Alergias y enfermedades van con peso: son las dos que cambian una
            // decisión clínica. Medicamentos y cirugías se leen en tono normal.
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
        // Sin cursiva: en una rejilla de cuatro celdas todas vacías, la cursiva
        // gris hacía que el bloque entero pareciera deshabilitado en vez de
        // simplemente sin datos.
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

      {/* Notas permanentes — SOLO LECTURA.
          Es la única superficie donde estas notas se ven: sin ella una
          advertencia como "anticoagulado, coordinar INR antes de exodoncia"
          seguía en base de datos pero era invisible en la ficha. NO lleva
          editor a propósito (ADR-65): el guardado era de reemplazo total y sin
          versiones, y había un segundo editor indistinguible sobre la misma
          nota. Va después del corte de `forbidden || loadError`, así que aquí
          ya está descartado el fallo de lectura (ADR-61). */}
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
              // Mismas defensas que la nota de visita: un token sin espacios o
              // una tabla ancha desbordaban la caja y el contenido clínico
              // quedaba recortado sin ninguna señal.
              className="prose prose-sm max-w-none text-ink dark:prose-invert [overflow-wrap:anywhere] [&_table]:block [&_table]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: clinicalNote.html }}
            />
            {/* Sólo se puede afirmar la ÚLTIMA edición: el backend sobreescribe
                la nota y no guarda versiones ni auditoría (ADR-62). */}
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
