"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarX,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Info,
  MoreVertical,
  Paperclip,
  User,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
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
import type { PatientAttachment } from "@/lib/entity/patientAttachment";
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
}

function getVisitStatusConfig(status: AppointmentStatus): VisitStatusConfig {
  switch (status) {
    case "in_progress":
      return { label: "Consulta en curso", tone: "success" };
    case "completed":
      return { label: "Consulta finalizada", tone: "progress" };
    case "no-show":
    case "no_show":
      return { label: "No asistió", tone: "danger" };
    case "scheduled":
    default:
      return { label: "Consulta agendada", tone: "warning" };
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
// Texto plano a partir del HTML de la nota (sólo para el resumen colapsado)
// ---------------------------------------------------------------------------

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&ntilde;": "ñ",
};

/**
 * Resumen de UNA línea para la tarjeta colapsada.
 *
 * No se usa para nada más: la nota íntegra siempre se pinta como HTML en el
 * bloque PLAN de la tarjeta expandida. Aquí sólo hace falta un texto plano que
 * quepa en una línea, así que se cortan las etiquetas sin tocar el DOM (el
 * componente también se renderiza en servidor).
 */
function htmlToPlainText(html: string): string {
  const withBreaks = html.replace(/<\/(p|div|li|h[1-6]|tr)>|<br\s*\/?>/gi, " ");
  const stripped = withBreaks.replace(/<[^>]*>/g, "");
  const decoded = stripped.replace(
    /&(nbsp|amp|lt|gt|quot|#39|aacute|eacute|iacute|oacute|uacute|ntilde);/gi,
    (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity,
  );
  return decoded.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Adjuntos
// ---------------------------------------------------------------------------

function attachmentIcon(mimeType: string | undefined) {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf")) return FileText;
  return Paperclip;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface VisitEntryCardProps {
  appointment: Appointment;
  state: VisitRecordState;
  /** Reintenta la carga del registro tras un fallo técnico. */
  onRetry: () => void;
  /**
   * La tarjeta nace desplegada. La columna se lo pasa sólo a la consulta más
   * reciente (o a la que está en curso); el resto empiezan plegadas.
   */
  defaultExpanded?: boolean;
  /**
   * Adjuntos que el host atribuye a ESTA consulta. Si no llega nada, no se
   * pinta el bloque: el listado de adjuntos del paciente no devuelve
   * `appointmentId`, así que esta tarjeta no puede deducir por su cuenta qué
   * archivo pertenece a qué visita.
   */
  attachments?: PatientAttachment[];
  /** Acciones de LECTURA del menú "⋯". Sin handlers no se pinta el menú. */
  onViewOdontogram?: (appointment: Appointment) => void;
  onViewAttachments?: (appointment: Appointment) => void;
  /**
   * Acciones sobre la AGENDA. Van al final del menú y separadas de las de
   * lectura porque cambian una cita real. El host es quien comprueba el permiso
   * (`appointments:EDIT`): si no lo hay, no pasa los handlers y no se pintan —
   * ausentes, no deshabilitados.
   *
   * Solo tienen sentido sobre una cita `scheduled`; la tarjeta lo comprueba y no
   * las ofrece sobre una consulta ya finalizada o no asistida.
   */
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
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
 *
 * Plegada muestra el encabezado y un resumen de una línea; desplegada muestra
 * los cuatro bloques de la evolución (subjetivo, objetivo, apreciación, plan).
 * Esos bloques NO salen de parsear el HTML de la nota: el backend no tiene
 * modelo SOAP (`clinical_notes` es UNA columna de texto), así que cada bloque
 * se arma con un campo real distinto del registro.
 */
export function VisitEntryCard({
  appointment,
  state,
  onRetry,
  defaultExpanded = false,
  attachments,
  onViewOdontogram,
  onViewAttachments,
  onReschedule,
  onCancel,
}: VisitEntryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = useId();

  const statusConfig = getVisitStatusConfig(appointment.status);
  const typeLabel = appointment.type
    ? (APPOINTMENT_TYPE_LABEL[appointment.type] ?? appointment.type)
    : null;
  const title =
    appointment.services?.[0]?.serviceName?.trim() || typeLabel || "Consulta";
  const doctorName = appointment.doctorName?.trim() || "Sin doctor asignado";
  // "Doctor de la cita" es literal y NO se puede abreviar a "Dr." a secas en el
  // texto accesible: es la asignación de AGENDA, no constancia de quién atendió
  // ni de quién escribió la nota (cualquiera puede iniciar la cita de otro).
  const doctorLabel = `Doctor de la cita: ${doctorName}`;
  const canManageThisAppointment =
    appointment.status === "scheduled" && Boolean(onReschedule || onCancel);
  const hasMenu = Boolean(
    onViewOdontogram || onViewAttachments || canManageThisAppointment,
  );

  const summary =
    state.status === "ready"
      ? htmlToPlainText(state.record.clinicalNotes ?? "")
      : "";

  return (
    <section
      className={cn(
        "bento overflow-hidden",
        // El borde de marca marca la consulta abierta, como en el mockup.
        expanded && "border-l-2 border-l-brand",
      )}
    >
      <div className="flex items-start gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-colors ease-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">
              {title} · {formatLongDate(appointment.date)}
            </span>

            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle">
              <span
                className="inline-flex items-center gap-1"
                title={doctorLabel}
                aria-label={doctorLabel}
              >
                <User className="h-3 w-3 shrink-0" aria-hidden="true" />
                Dr. {doctorName}
              </span>
              {appointment.time ? (
                <>
                  <span aria-hidden="true">·</span>
                  {/* El DTO de la lista no trae la hora real de atención:
                      presentar la hora de agenda como hora de atención sería
                      falso, así que va rotulada. */}
                  <span>{appointment.time} agendada</span>
                </>
              ) : null}
              <StatusBadge tone={statusConfig.tone} className="text-[10px]">
                {statusConfig.label}
              </StatusBadge>
            </span>

            {!expanded ? (
              <CollapsedSummary state={state} summary={summary} />
            ) : null}
          </span>

          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-subtle transition-transform ease-emphasized motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Más opciones de esta consulta"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors ease-emphasized hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Más opciones de esta consulta</span>
              </button>
            </DropdownMenuTrigger>
            {/* Superficie de lectura: sólo verbos de consulta, ninguna acción
                de edición ni destructiva. */}
            <DropdownMenuContent align="end">
              {onViewOdontogram ? (
                <DropdownMenuItem onClick={() => onViewOdontogram(appointment)}>
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  Ver odontograma de esta visita
                </DropdownMenuItem>
              ) : null}
              {/* "del paciente", no "de esta visita": el único destino que
                  existe hoy es la pestaña de archivos, que lista TODOS los
                  adjuntos del paciente — el listado ni siquiera devuelve
                  `appointmentId`. Prometer un filtro por visita sería falso. */}
              {onViewAttachments ? (
                <DropdownMenuItem onClick={() => onViewAttachments(appointment)}>
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  Ver archivos del paciente
                </DropdownMenuItem>
              ) : null}

              {/* Agenda. Solo sobre una cita AGENDADA: reprogramar o cancelar
                  una consulta ya finalizada no es una operación que exista. */}
              {appointment.status === "scheduled" && (onReschedule || onCancel) ? (
                <>
                  <DropdownMenuSeparator />
                  {onReschedule ? (
                    <DropdownMenuItem onClick={() => onReschedule(appointment)}>
                      <CalendarClock className="h-4 w-4" aria-hidden="true" />
                      Reagendar cita
                    </DropdownMenuItem>
                  ) : null}
                  {/* Destructiva al final, y en rojo. */}
                  {onCancel ? (
                    <DropdownMenuItem
                      onClick={() => onCancel(appointment)}
                      className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                    >
                      <CalendarX className="h-4 w-4" aria-hidden="true" />
                      Cancelar cita
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div id={bodyId} className={cn(!expanded && "hidden")}>
        {expanded ? (
          <div className="px-4 pb-4">
            <VisitEntryBody
              appointment={appointment}
              state={state}
              onRetry={onRetry}
              attachments={attachments}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Resumen de la tarjeta plegada. Nunca convierte un fallo técnico en silencio:
 * si el registro no se pudo cargar, lo dice en la propia fila plegada.
 */
function CollapsedSummary({
  state,
  summary,
}: {
  state: VisitRecordState;
  summary: string;
}) {
  if (state.status === "failed") {
    return (
      <span className="mt-1 block truncate text-xs text-amber-700 dark:text-amber-300">
        No se pudo cargar el registro de esta visita
      </span>
    );
  }
  if (!summary) return null;
  return (
    <span className="mt-1 block truncate text-xs text-subtle">{summary}</span>
  );
}

// ---------------------------------------------------------------------------
// Cuerpo: los tres estados + los bloques de la evolución
// ---------------------------------------------------------------------------

function VisitEntryBody({
  appointment,
  state,
  onRetry,
  attachments,
}: {
  appointment: Appointment;
  state: VisitRecordState;
  onRetry: () => void;
  attachments?: PatientAttachment[];
}) {
  if (state.status === "idle" || state.status === "loading") {
    return <VisitEntrySkeleton />;
  }

  if (state.status === "failed") {
    // Un fallo técnico NO es ausencia de dato clínico: jamás "Sin nota".
    return (
      <div className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300">
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
    return <p className="text-xs italic text-subtle">Sin registro de visita</p>;
  }

  return (
    <VisitRecordBands
      appointment={appointment}
      record={state.record}
      attachments={attachments}
    />
  );
}

function VisitEntrySkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-3 w-24 animate-pulse rounded bg-hover" />
      <div className="h-3 w-full animate-pulse rounded bg-hover" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-hover" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-hover" />
    </div>
  );
}

/**
 * Los cuatro bloques de la evolución, cada uno construido con un CAMPO REAL
 * distinto del registro (no hay modelo SOAP en el backend, y parsear el HTML de
 * la nota buscando encabezados inventaría una estructura que nadie escribió):
 *
 *   SUBJETIVO   ← `chiefComplaint` + `currentPain`
 *   OBJETIVO    ← `examFindings`
 *   APRECIACIÓN ← `diagnoses`
 *   PLAN        ← `clinicalNotes`
 *
 * Un bloque sin dato NO se renderiza — ni rótulo, ni guion, ni caja vacía. La
 * única excepción es PLAN: "hay registro pero nadie escribió la evolución" es
 * uno de los tres estados que la vista tiene que distinguir siempre, así que
 * ese mensaje se muestra aunque el resto del registro esté vacío.
 */
function VisitRecordBands({
  appointment,
  record,
  attachments,
}: {
  appointment: Appointment;
  record: PatientVisitRecord;
  attachments?: PatientAttachment[];
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
    <div className="space-y-4">
      {chiefComplaint || painText ? (
        <section>
          <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>Subjetivo</h3>
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
          <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>Objetivo</h3>
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

      {diagnoses.length > 0 ? (
        <section>
          <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>Apreciación</h3>
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

      <section>
        <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>Plan</h3>
        {notes ? (
          <ClinicalNote html={notes} />
        ) : (
          // Hay registro, pero nadie escribió la evolución. No es un fallo.
          <p className="text-xs italic text-subtle">
            Sin nota de evolución registrada
          </p>
        )}
      </section>

      <VisitAttachments attachments={attachments} />

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
 * Adjuntos que el host atribuye a esta consulta.
 *
 * El rótulo dice "de esta consulta" y no "de esta nota" a propósito: el backend
 * asocia el archivo a la CITA, no a la evolución, y el DTO del listado ni
 * siquiera devuelve `appointmentId`. Sin datos del host no se pinta nada; una
 * caja vacía sugeriría que se comprobó y no hay adjuntos.
 */
function VisitAttachments({ attachments }: { attachments?: PatientAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <section>
      <h3 className={cn(SECTION_LABEL_CLASS, "mb-1.5 block")}>
        Adjuntos de esta consulta
      </h3>
      <ul className="flex flex-wrap gap-1.5">
        {attachments.map((attachment) => {
          const Icon = attachmentIcon(attachment.mimeType);
          return (
            <li
              key={attachment.id}
              className={cn(CHIP_CLASS, "max-w-full")}
              title={attachment.fileName}
            >
              <Icon className="h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />
              <span className="truncate">{attachment.fileName}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
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
          // Un token sin espacios (una URL pegada, un código largo) desbordaba
          // la caja y lo recortaba el `overflow-hidden` de la tarjeta, sin rueda
          // ni scroll que lo alcanzara: contenido de la historia clínica
          // invisible y sin ninguna señal. Las tablas se hacen scrollables por
          // su cuenta por el mismo motivo.
          "[overflow-wrap:anywhere] [&_table]:block [&_table]:overflow-x-auto",
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
