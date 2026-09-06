"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, Info } from "lucide-react";
import { Button, StatusBadge, type StatusBadgeTone } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { MONTHS_ES, dateToLocalInput } from "@/lib/datetime";
import { CIE10_DENTAL_CODES } from "@/lib/entity/clinical-history/cie10-dental";
import type {
  ExamFindings,
  PatientVisitRecord,
  VisitDiagnosis,
} from "@/lib/entity/clinical-history";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from "@/lib/entity/appointment/appointments";
import type { VisitRecordState } from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import { SECTION_LABEL_CLASS } from "../section-label";

// ---------------------------------------------------------------------------
// Catálogo CIE-10: resolución de etiquetas
// ---------------------------------------------------------------------------

/**
 * Índice `code -> label` del catálogo dental. El backend guarda `label` junto al
 * código, pero en registros antiguos (o migrados) puede llegar vacío: un código
 * desnudo ("K02.1") en un documento clínico no es legible por nadie que no lo
 * tenga memorizado, así que se resuelve contra el catálogo antes de pintarlo.
 */
const CIE10_LABEL_BY_CODE: Map<string, string> = new Map(
  CIE10_DENTAL_CODES.map((entry) => [entry.code.toUpperCase(), entry.label]),
);

function resolveDiagnosisLabel(diagnosis: VisitDiagnosis): string {
  const own = diagnosis.label?.trim();
  if (own) return own;
  const fromCatalog = CIE10_LABEL_BY_CODE.get(diagnosis.code?.trim().toUpperCase() ?? "");
  if (fromCatalog) return fromCatalog;
  return "Sin descripción en el catálogo";
}

// ---------------------------------------------------------------------------
// Estado de la CONSULTA (nunca de la nota)
// ---------------------------------------------------------------------------

interface VisitStatusConfig {
  /** Frase completa: un pill que dijera sólo "Finalizada" podría leerse como
   *  estado de la NOTA (firmada/cerrada), que es justo lo que no existe aquí. */
  label: string;
  tone: StatusBadgeTone;
  dotClass: string;
}

function getVisitStatusConfig(status: AppointmentStatus): VisitStatusConfig {
  switch (status) {
    case "in_progress":
      return { label: "Consulta en curso", tone: "success", dotClass: "bg-emerald-500" };
    case "completed":
      return { label: "Consulta finalizada", tone: "progress", dotClass: "bg-sky-500" };
    case "no-show":
    case "no_show":
      return { label: "No asistió", tone: "danger", dotClass: "bg-rose-400 opacity-70" };
    case "scheduled":
    default:
      return { label: "Consulta agendada", tone: "warning", dotClass: "bg-amber-400" };
  }
}

const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  consultation: "Consulta",
  control: "Control",
  emergency: "Urgencia",
  follow_up: "Seguimiento",
  routine: "Rutina",
};

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** "2026-08-14" -> { day: "14", monthYear: "AGO 2026" } sin pasar por UTC. */
function splitVisitDate(date: string): { day: string; monthYear: string } {
  const day = date?.slice(8, 10) ?? "";
  const year = date?.slice(0, 4) ?? "";
  const monthIndex = Number(date?.slice(5, 7)) - 1;
  const month = MONTHS_ES[monthIndex]?.slice(0, 3) ?? "";
  return { day, monthYear: month && year ? `${month} ${year}` : "" };
}

/** Fecha larga en español a partir de "YYYY-MM-DD" (sin `new Date(str)`). */
function formatLongDate(date: string): string {
  const day = Number(date?.slice(8, 10));
  const monthIndex = Number(date?.slice(5, 7)) - 1;
  const year = date?.slice(0, 4);
  const month = MONTHS_ES[monthIndex]?.toLowerCase();
  if (!day || !month || !year) return date ?? "";
  return `${day} de ${month} de ${year}`;
}

interface StampMoment {
  /** "YYYY-MM-DD" en hora LOCAL, para comparar con `appointment.date`. */
  localDate: string;
  /** Texto ya legible: "14 de agosto de 2026 18:42". */
  text: string;
}

function parseStamp(iso: string | undefined): StampMoment | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    // Cadena que el runtime no sabe parsear: se muestra tal cual antes que
    // inventar una fecha. La comparación cae a los primeros 10 caracteres.
    return { localDate: iso.slice(0, 10), text: iso };
  }
  const localDate = dateToLocalInput(parsed);
  const time = `${String(parsed.getHours()).padStart(2, "0")}:${String(
    parsed.getMinutes(),
  ).padStart(2, "0")}`;
  return { localDate, text: `${formatLongDate(localDate)} ${time}` };
}

// ---------------------------------------------------------------------------
// Autoría
// ---------------------------------------------------------------------------

/**
 * El backend sobreescribe la nota y sólo conserva el ÚLTIMO editor. Cuando ese
 * campo no identifica a nadie (`null`, vacío o el literal "anonymous") no hay
 * constancia de autoría, y NO se puede sustituir por `doctorName`: el doctor de
 * la cita es una asignación de agenda, no prueba de quién escribió la nota.
 */
function resolveAuthorship(updatedBy: string | undefined | null): string | null {
  const value = updatedBy?.trim();
  if (!value || value.toLowerCase() === "anonymous") return null;
  return value;
}

// ---------------------------------------------------------------------------
// Hallazgos del examen
// ---------------------------------------------------------------------------

const EXTRAORAL_LABELS: Array<[keyof NonNullable<ExamFindings["extraoral"]>, string]> = [
  ["facialAsymmetry", "Simetría facial"],
  ["tmjNotes", "Articulación temporomandibular"],
  ["lymphNodes", "Ganglios linfáticos"],
  ["lips", "Labios"],
  ["other", "Otros hallazgos extraorales"],
];

const INTRAORAL_LABELS: Array<[keyof NonNullable<ExamFindings["intraoral"]>, string]> = [
  ["softTissue", "Tejidos blandos"],
  ["hardTissue", "Tejidos duros"],
  ["periodontium", "Periodonto"],
  ["occlusion", "Oclusión"],
  ["hygiene", "Higiene bucal"],
  ["other", "Otros hallazgos intraorales"],
];

function collectFindings(
  source: Record<string, string | undefined> | undefined,
  labels: Array<[string, string]>,
): Array<{ label: string; value: string }> {
  if (!source) return [];
  const rows: Array<{ label: string; value: string }> = [];
  for (const [key, label] of labels) {
    const value = source[key]?.trim();
    if (value) rows.push({ label, value });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface VisitEntryCardProps {
  appointment: Appointment;
  state: VisitRecordState;
  /** Reintenta la carga del registro tras un fallo técnico. */
  onRetry: () => void;
  isLast?: boolean;
}

/** Altura a partir de la cual la nota se pliega (px). */
const NOTE_COLLAPSED_MAX_PX = 352; // = max-h-[22rem]

const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg bg-hover px-2 py-1 text-xs text-ink ring-1 ring-hairline";

/**
 * Una consulta de la evolución clínica, en modo LECTURA.
 *
 * No monta editores, ni cajas de texto, ni acciones destructivas: es una
 * superficie de consulta de un registro clínico-legal. Distingue de forma
 * explícita los tres estados que jamás deben confundirse — no hay registro
 * (404), hay registro pero sin nota, y fallo técnico al cargarlo.
 */
export function VisitEntryCard({
  appointment,
  state,
  onRetry,
  isLast = false,
}: VisitEntryCardProps) {
  const statusConfig = getVisitStatusConfig(appointment.status);
  const { day, monthYear } = splitVisitDate(appointment.date);
  const typeLabel = appointment.type
    ? (APPOINTMENT_TYPE_LABEL[appointment.type] ?? appointment.type)
    : null;

  return (
    <section className="bento overflow-hidden">
      <div className="grid grid-cols-[76px_1fr] gap-3 p-4">
        {/* ── Rail temporal ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center border-r border-hairline pr-3 text-center">
          <span className="text-2xl font-semibold tabular-nums leading-none text-ink">
            {day}
          </span>
          <span className="mt-1 text-[11px] uppercase leading-none text-subtle">
            {monthYear}
          </span>
          <span
            className={cn("mt-2 h-2 w-2 rounded-full", statusConfig.dotClass)}
            aria-hidden="true"
          />
          <span className="mt-2 text-xs tabular-nums leading-none text-ink">
            {appointment.time}
          </span>
          {/* Rótulo obligatorio: el DTO de la lista no trae la hora real de
              atención, así que presentar la hora de agenda como hora de
              atención sería falso. */}
          <span className="mt-0.5 text-[10px] leading-none text-subtle">agendada</span>
          {!isLast ? (
            <span
              className="mt-3 w-px flex-1 bg-hairline/60"
              aria-hidden="true"
            />
          ) : null}
        </div>

        {/* ── Contenido ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusConfig.tone}>{statusConfig.label}</StatusBadge>
            {typeLabel ? (
              <span className="inline-flex items-center rounded-full bg-hover px-2.5 py-0.5 text-xs font-medium text-subtle ring-1 ring-hairline">
                {typeLabel}
              </span>
            ) : null}
          </div>

          {/* "Doctor de la cita" es literal: es la asignación de AGENDA, no
              constancia de quién atendió ni de quién escribió la nota. */}
          <p className="mt-2 text-xs text-subtle">
            Doctor de la cita:{" "}
            <span className="text-ink">
              {appointment.doctorName?.trim() || "Sin doctor asignado"}
            </span>
          </p>

          <VisitEntryBody
            appointment={appointment}
            state={state}
            onRetry={onRetry}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cuerpo: los tres estados + las bandas APSO
// ---------------------------------------------------------------------------

function VisitEntryBody({
  appointment,
  state,
  onRetry,
}: {
  appointment: Appointment;
  state: VisitRecordState;
  onRetry: () => void;
}) {
  if (state.status === "idle" || state.status === "loading") {
    return <VisitEntrySkeleton />;
  }

  if (state.status === "failed") {
    // Un fallo técnico NO es ausencia de dato clínico: jamás "Sin nota".
    return (
      <div className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">No se pudo cargar el registro de esta visita</p>
            {state.message ? (
              <p className="mt-0.5 opacity-80">{state.message}</p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2 pointer-coarse:h-11 pointer-coarse:px-4"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    // 404: la visita no tiene registro clínico creado.
    return (
      <p className="mt-3 text-xs italic text-subtle">Sin registro de visita</p>
    );
  }

  return <VisitRecordBands appointment={appointment} record={state.record} />;
}

function VisitEntrySkeleton() {
  return (
    <div className="mt-3 space-y-2" aria-hidden="true">
      <div className="h-3 w-24 animate-pulse rounded bg-hover" />
      <div className="h-3 w-full animate-pulse rounded bg-hover" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-hover" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-hover" />
    </div>
  );
}

/**
 * Bandas en orden APSO (valoración y plan primero, luego lo subjetivo y lo
 * objetivo): es como se lee una evolución en la práctica clínica.
 * Una banda sin dato no se renderiza — ni rótulo, ni guion, ni fila vacía.
 */
function VisitRecordBands({
  appointment,
  record,
}: {
  appointment: Appointment;
  record: PatientVisitRecord;
}) {
  const diagnoses = record.diagnoses?.filter((d) => d?.code || d?.label) ?? [];
  const chiefComplaint = record.chiefComplaint?.trim();
  const painText = formatPain(record.currentPain);
  const extraoral = collectFindings(
    record.examFindings?.extraoral as Record<string, string | undefined> | undefined,
    EXTRAORAL_LABELS as Array<[string, string]>,
  );
  const intraoral = collectFindings(
    record.examFindings?.intraoral as Record<string, string | undefined> | undefined,
    INTRAORAL_LABELS as Array<[string, string]>,
  );
  const notes = record.clinicalNotes?.trim();

  return (
    <div className="mt-3 space-y-4">
      {diagnoses.length > 0 ? (
        <section>
          <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>Diagnósticos</h3>
          <ul className="flex flex-wrap gap-1.5">
            {diagnoses.map((diagnosis, index) => (
              <li key={`${diagnosis.code}-${index}`} className={CHIP_CLASS}>
                <span className="font-medium">
                  {diagnosis.code} — {resolveDiagnosisLabel(diagnosis)}
                </span>
                <span className="text-[10px] text-subtle">
                  {diagnosis.status === "confirmed" ? "Confirmado" : "Provisional"}
                </span>
                {diagnosis.toothRef?.fdi ? (
                  <span className="rounded bg-surface px-1 text-[10px] tabular-nums text-subtle ring-1 ring-hairline">
                    Pieza {diagnosis.toothRef.fdi}
                    {diagnosis.toothRef.surface ? ` · ${diagnosis.toothRef.surface}` : ""}
                  </span>
                ) : null}
                {diagnosis.source === "odontogram" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-subtle">
                    <Activity className="h-2.5 w-2.5" aria-hidden="true" />
                    derivado del odontograma
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {chiefComplaint || painText ? (
        <section>
          <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>
            Motivo de consulta registrado
          </h3>
          {/* Sin comillas y sin atribuirlo al paciente: este texto lo siembra el
              backend desde las notas de la cita, que puede haber escrito
              recepción. */}
          {chiefComplaint ? (
            <p className="text-sm leading-relaxed text-ink">{chiefComplaint}</p>
          ) : null}
          {painText ? (
            <p className="mt-1 text-xs text-subtle">
              <span className="text-ink">Dolor:</span> {painText}
            </p>
          ) : null}
        </section>
      ) : null}

      {extraoral.length > 0 || intraoral.length > 0 ? (
        <section>
          <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>
            Hallazgos del examen
          </h3>
          <div className="space-y-2">
            {extraoral.length > 0 ? (
              <FindingsGroup title="Extraoral" rows={extraoral} />
            ) : null}
            {intraoral.length > 0 ? (
              <FindingsGroup title="Intraoral" rows={intraoral} />
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>Nota de evolución</h3>
        {notes ? (
          <ClinicalNote html={notes} />
        ) : (
          // Hay registro, pero nadie escribió la evolución. No es un fallo.
          <p className="text-xs italic text-subtle">
            Sin nota de evolución registrada
          </p>
        )}
      </section>

      <VisitStampFooter appointment={appointment} record={record} />
    </div>
  );
}

function FindingsGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-subtle">{title}</p>
      <dl className="mt-1 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap gap-x-1.5 text-xs">
            <dt className="text-subtle">{row.label}:</dt>
            <dd className="min-w-0 text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatPain(pain: PatientVisitRecord["currentPain"]): string | null {
  if (!pain) return null;
  const parts: string[] = [];
  if (typeof pain.intensity === "number" && !Number.isNaN(pain.intensity)) {
    parts.push(`${pain.intensity}/10`);
  }
  if (pain.type?.trim()) parts.push(pain.type.trim());
  if (pain.duration?.trim()) parts.push(pain.duration.trim());
  if (pain.location?.trim()) parts.push(pain.location.trim());
  if (pain.toothRef?.fdi) parts.push(`pieza ${pain.toothRef.fdi}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Nota de evolución íntegra. Si es muy larga se pliega, pero nunca se trunca
 * con puntos suspensivos: todo el contenido tiene que ser alcanzable desde la
 * misma tarjeta, sin abrir nada.
 *
 * El HTML llega ya saneado del servidor.
 */
function ClinicalNote({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // La nota cambió: se vuelve a plegar y se re-mide.
    setExpanded(false);
    const node = contentRef.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollHeight > NOTE_COLLAPSED_MAX_PX + 16);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [html]);

  const collapsed = overflows && !expanded;

  return (
    <div>
      <div
        ref={contentRef}
        className={cn(
          "prose prose-sm max-w-none text-ink dark:prose-invert",
          collapsed && "max-h-[22rem] overflow-hidden",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {overflows ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 h-8 px-2 text-xs text-brand"
        >
          {expanded ? "Contraer nota" : "Ver nota completa"}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Pie de sello. Siempre visible, nunca detrás de un hover.
 *
 * Sólo se puede afirmar la ÚLTIMA edición: el backend sobreescribe la nota y no
 * guarda versiones ni auditoría, así que aquí no hay autor, ni firma, ni
 * validación, ni historial.
 */
function VisitStampFooter({
  appointment,
  record,
}: {
  appointment: Appointment;
  record: PatientVisitRecord;
}) {
  const [showNotice, setShowNotice] = useState(false);
  const author = resolveAuthorship(record.clinicalNotesUpdatedBy);
  const stamp = parseStamp(record.clinicalNotesUpdatedAt);
  const annotatedLate = Boolean(stamp && stamp.localDate > appointment.date);

  return (
    <div className="mt-3 border-t border-hairline pt-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle">
        {author && stamp ? (
          <span>
            Última edición: <span className="text-ink">{author}</span> · {stamp.text}
          </span>
        ) : author ? (
          <span>
            Última edición: <span className="text-ink">{author}</span>
          </span>
        ) : (
          <span className="italic">Sin registro de autoría</span>
        )}

        <button
          type="button"
          onClick={() => setShowNotice((value) => !value)}
          aria-expanded={showNotice}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-subtle transition-colors ease-emphasized hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Info className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">
            Qué significa &quot;última edición&quot;
          </span>
        </button>
      </div>

      {/* Se despliega EN LÍNEA: una capa flotante escondería una advertencia
          que forma parte del registro. */}
      {showNotice ? (
        <p className="mt-1.5 rounded-lg bg-hover px-2.5 py-2 text-[11px] leading-relaxed text-subtle">
          El sistema conserva únicamente la última edición de la nota. En una
          misma nota pueden haber intervenido varios profesionales.
        </p>
      ) : null}

      {annotatedLate && stamp ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          Anotada después de la fecha de la consulta ·{" "}
          {formatLongDate(stamp.localDate)}
        </p>
      ) : null}
    </div>
  );
}

export default VisitEntryCard;
