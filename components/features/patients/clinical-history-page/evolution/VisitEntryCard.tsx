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
  Lock,
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
import { MONTHS_ES, dateToLocalDate } from "@/lib/datetime";
import { CIE10_DENTAL_CODES } from "@/lib/entity/clinical-history/cie10-dental";
import {
  NO_AUTHORSHIP_LABEL,
  resolveAuthorship,
} from "@/lib/utils/clinical-authorship";
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
interface VisitStatusConfig {
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
function formatLongDate(date: string): string {
  const day = Number(date?.slice(8, 10));
  const monthIndex = Number(date?.slice(5, 7)) - 1;
  const year = date?.slice(0, 4);
  const month = MONTHS_ES[monthIndex]?.toLowerCase();
  if (!day || !month || !year) return date ?? "";
  return `${day} de ${month} de ${year}`;
}
interface StampMoment {
  localDate: string;
  text: string;
}
function parseStamp(iso: string | undefined): StampMoment | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {

    return { localDate: iso.slice(0, 10), text: iso };
  }
  const localDate = dateToLocalDate(parsed);
  const time = `${String(parsed.getHours()).padStart(2, "0")}:${String(
    parsed.getMinutes(),
  ).padStart(2, "0")}`;
  return { localDate, text: `${formatLongDate(localDate)} ${time}` };
}
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
function htmlToPlainText(html: string): string {
  const withBreaks = html.replace(/<\/(p|div|li|h[1-6]|tr)>|<br\s*\/?>/gi, " ");
  const stripped = withBreaks.replace(/<[^>]*>/g, "");
  const decoded = stripped.replace(
    /&(nbsp|amp|lt|gt|quot|#39|aacute|eacute|iacute|oacute|uacute|ntilde);/gi,
    (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity,
  );
  return decoded.replace(/\s+/g, " ").trim();
}
function attachmentIcon(mimeType: string | undefined) {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf")) return FileText;
  return Paperclip;
}

export interface VisitEntryCardProps {
  appointment: Appointment;
  state: VisitRecordState;
  onRetry: () => void;
  canViewClinicalHistory?: boolean;
  defaultExpanded?: boolean;
  attachments?: PatientAttachment[];
  onViewOdontogram?: (appointment: Appointment) => void;
  onViewAttachments?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
}
const NOTE_COLLAPSED_MAX_PX = 352;
const BLOCK_LABEL_CLASS =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-subtle/80";
const PROSE_BOX_CLASS =
  "rounded-xl bg-hover/60 p-3 text-sm leading-relaxed text-ink";
const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg bg-hover px-2 py-1 text-xs text-ink ring-1 ring-hairline";
export function VisitEntryCard({
  appointment,
  state,
  onRetry,
  canViewClinicalHistory = true,
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
  const isRunning = appointment.status === "in_progress";
  const typeLabel = appointment.type
    ? (APPOINTMENT_TYPE_LABEL[appointment.type] ?? appointment.type)
    : null;
  const title =
    appointment.services?.[0]?.serviceName?.trim() || typeLabel || "Consulta";
  const doctorName = appointment.doctorName?.trim() || "Sin doctor asignado";
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
        "overflow-hidden rounded-2xl border border-hairline bg-surface",
        "shadow-sm transition-all ease-emphasized hover:border-hairline/80",
        isRunning && "bg-brand/[0.02] ring-1 ring-brand/30",
      )}
    >
      <div className="flex items-start gap-2 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-colors ease-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-ink">
              {title}{" "}
              <span className="font-normal text-subtle">
                · {formatLongDate(appointment.date)}
              </span>
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
              {appointment.status === "scheduled" && appointment.time ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{appointment.time}</span>
                </>
              ) : null}
              <StatusBadge tone={statusConfig.tone} className="text-[10px]">
                {statusConfig.label}
              </StatusBadge>
            </span>
            {!expanded ? (
              <CollapsedSummary
                state={state}
                summary={summary}
                canViewClinicalHistory={canViewClinicalHistory}
              />
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
            <DropdownMenuContent align="end">
              {onViewOdontogram ? (
                <DropdownMenuItem onClick={() => onViewOdontogram(appointment)}>
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  Ver odontograma de esta visita
                </DropdownMenuItem>
              ) : null}
              {onViewAttachments ? (
                <DropdownMenuItem onClick={() => onViewAttachments(appointment)}>
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  Ver archivos del paciente
                </DropdownMenuItem>
              ) : null}
              {appointment.status === "scheduled" && (onReschedule || onCancel) ? (
                <>
                  <DropdownMenuSeparator />
                  {onReschedule ? (
                    <DropdownMenuItem onClick={() => onReschedule(appointment)}>
                      <CalendarClock className="h-4 w-4" aria-hidden="true" />
                      Reagendar cita
                    </DropdownMenuItem>
                  ) : null}
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
              canViewClinicalHistory={canViewClinicalHistory}
              attachments={attachments}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
function CollapsedSummary({
  state,
  summary,
  canViewClinicalHistory,
}: {
  state: VisitRecordState;
  summary: string;
  canViewClinicalHistory: boolean;
}) {

  if (!canViewClinicalHistory) {
    return (
      <span className="mt-1 block truncate text-xs italic text-subtle">
        Sin acceso al registro de esta visita
      </span>
    );
  }
  if (state.status === "failed") {
    return (
      <span className="mt-1 block truncate text-xs text-amber-700 dark:text-amber-300">
        No se pudo cargar el registro de esta visita
      </span>
    );
  }
  if (!summary) return null;
  return (
    <span
      aria-hidden="true"
      className="mt-1 block truncate text-xs text-subtle"
    >
      {summary}
    </span>
  );
}
function VisitEntryBody({
  appointment,
  state,
  onRetry,
  canViewClinicalHistory,
  attachments,
}: {
  appointment: Appointment;
  state: VisitRecordState;
  onRetry: () => void;
  canViewClinicalHistory: boolean;
  attachments?: PatientAttachment[];
}) {
  const services = <VisitAppointmentServices appointment={appointment} />;
  if (!canViewClinicalHistory) {
    return (
      <div className="space-y-3.5">
        {services}
        <div className="rounded-lg bg-hover px-3 py-2.5 text-xs text-subtle">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-ink">
                Sin acceso al registro de esta visita
              </p>
              <p className="mt-0.5 leading-relaxed">
                Tu rol no permite ver la historia clínica de este paciente. Lo
                que no se muestra aquí no significa que la visita no tenga
                anotaciones clínicas.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (
    appointment.status === "scheduled" &&
    (state.status === "idle" ||
      state.status === "loading" ||
      state.status === "empty")
  ) {
    return (
      <div className="space-y-3.5">
        {services}
        <p className="text-xs italic text-subtle">
          Consulta agendada — pendiente de atención
        </p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-3.5">
        {services}
        <div aria-busy="true">
          <span className="sr-only">Cargando el registro de esta visita…</span>
          <VisitEntrySkeleton />
        </div>
      </div>
    );
  }

  if (state.status === "idle") {

    return (
      <div className="space-y-3.5">
        {services}
        <VisitEntrySkeleton />
      </div>
    );
  }
  if (state.status === "failed") {
    return (
      <div className="space-y-3.5">
        {services}
        <div className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium">
                No se pudo cargar el registro de esta visita
              </p>
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
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="space-y-3.5">
        {services}
        <p className="text-xs italic text-subtle">Sin registro de visita</p>
      </div>
    );
  }
  return (
    <div className="space-y-3.5">
      {services}
      <VisitRecordBands
        appointment={appointment}
        record={state.record}
        attachments={attachments}
      />
    </div>
  );
}
function VisitAppointmentServices({ appointment }: { appointment: Appointment }) {
  const services = appointment.services ?? [];
  if (services.length < 2) return null;
  return (
    <section>
      <h3 className={BLOCK_LABEL_CLASS}>Servicios de la cita</h3>
      <ul className="space-y-1">
        {services.map((service, index) => (
          <li
            key={`${service.serviceId ?? "servicio"}-${index}`}
            className="flex gap-2 text-xs text-ink"
          >
            <span className="shrink-0 text-subtle" aria-hidden="true">
              ·
            </span>
            <span className="min-w-0">
              {service.serviceName?.trim() ||
                service.serviceCode?.trim() ||
                "Servicio sin nombre registrado"}
            </span>
          </li>
        ))}
      </ul>
    </section>
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
  const hasAnyClinicalData = Boolean(
    chiefComplaint ||
      painText ||
      extraoral.length ||
      intraoral.length ||
      diagnoses.length ||
      notes,
  );
  if (!hasAnyClinicalData) {
    return (
      <div className="space-y-4">
        <p className="py-2 text-center text-xs italic text-subtle">
          Sin anotaciones clínicas registradas en esta visita
        </p>
        <VisitAttachments attachments={attachments} />
        <VisitStampFooter appointment={appointment} record={record} />
      </div>
    );
  }
  return (
    <div className="space-y-3.5">
      {chiefComplaint || painText ? (
        <section>
          <h3 className={BLOCK_LABEL_CLASS}>Subjetivo</h3>
          <div className={PROSE_BOX_CLASS}>
            {chiefComplaint ? <p>{chiefComplaint}</p> : null}
            {painText ? (
              <p className={cn("text-xs text-subtle", chiefComplaint && "mt-1.5")}>
                <span className="font-medium text-ink">Dolor:</span> {painText}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {extraoral.length > 0 || intraoral.length > 0 ? (
        <section>
          <h3 className={BLOCK_LABEL_CLASS}>Objetivo</h3>
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
          <h3 className={BLOCK_LABEL_CLASS}>Apreciación</h3>
          <ul className="space-y-1.5">
            {diagnoses.map((diagnosis, index) => (
              <li
                key={`${diagnosis.code}-${index}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs"
              >
                {diagnosis.toothRef?.fdi ? (
                  <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand">
                    Pieza {diagnosis.toothRef.fdi}
                    {diagnosis.toothRef.surface
                      ? ` · ${diagnosis.toothRef.surface}`
                      : ""}
                  </span>
                ) : null}
                <span className="font-semibold text-ink">{diagnosis.code}</span>
                <span className="min-w-0 text-subtle">
                  {resolveDiagnosisLabel(diagnosis)}
                </span>
                {diagnosis.source === "odontogram" ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-subtle"
                    title="Este diagnóstico se derivó de lo registrado en el odontograma"
                  >
                    <Activity className="h-2.5 w-2.5" aria-hidden="true" />
                    del odontograma
                  </span>
                ) : null}
                <span className="ml-auto shrink-0 rounded bg-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-subtle">
                  {diagnosis.status === "confirmed" ? "Confirmado" : "Provisional"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {notes ? (
        <section>
          <h3 className={BLOCK_LABEL_CLASS}>Plan</h3>
          <div className={PROSE_BOX_CLASS}>
            <ClinicalNote html={notes} />
          </div>
        </section>
      ) : null}
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
function VisitAttachments({ attachments }: { attachments?: PatientAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <section>
      <h3 className={BLOCK_LABEL_CLASS}>Adjuntos de esta consulta</h3>
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
function ClinicalNote({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
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
        {author ? (
          <span>
            Última edición: <span className="text-ink">{author}</span>
            {stamp ? ` · ${stamp.text}` : ""}
          </span>
        ) : stamp ? (
          <span>
            <span className="italic">{NO_AUTHORSHIP_LABEL}</span> · {stamp.text}
          </span>
        ) : (
          <span className="italic">{NO_AUTHORSHIP_LABEL}</span>
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
