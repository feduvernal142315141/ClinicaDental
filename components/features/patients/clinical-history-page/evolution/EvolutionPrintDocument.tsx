"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/utils";
import { MONTHS_ES, dateToLocalInput, nowLocalInput } from "@/lib/datetime";
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
import type { VisitRecordState } from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { orderEvolutionAppointments } from "./use-evolution-print";

const BACKEND_PAGE_CAP = 100;
const SCOPE_STATEMENT =
  "Documento generado desde Clinic Flow 360. Ordenado por fecha de atención · " +
  "No incluye consultas canceladas · Se conserva únicamente la última edición " +
  "de cada nota · Los comparativos de odontograma no se incluyen en esta " +
  "impresión; están disponibles en el sistema por consulta · No incluye los " +
  "archivos adjuntos del expediente (imágenes, radiografías y " +
  "consentimientos), disponibles en el sistema.";
const TRUNCATION_STATEMENT =
  "Se muestran las 100 consultas más recientes registradas; puede haber " +
  "consultas anteriores no listadas.";
const CIE10_LABEL_BY_CODE: Map<string, string> = new Map(
  CIE10_DENTAL_CODES.map((entry) => [entry.code.toUpperCase(), entry.label]),
);
function resolveDiagnosisLabel(diagnosis: VisitDiagnosis): string {
  const own = diagnosis.label?.trim();
  if (own) return own;
  const fromCatalog = CIE10_LABEL_BY_CODE.get(
    diagnosis.code?.trim().toUpperCase() ?? "",
  );
  if (fromCatalog) return fromCatalog;
  return "Sin descripción en el catálogo";
}
function getVisitStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "in_progress":
      return "Consulta en curso";
    case "completed":
      return "Consulta finalizada";
    case "no-show":
    case "no_show":
      return "No asistió";
    case "scheduled":
    default:
      return "Consulta agendada";
  }
}
const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  consultation: "Consulta",
  control: "Control",
  emergency: "Urgencia",
  follow_up: "Seguimiento",
  routine: "Rutina",
};

function collectServiceNames(appointment: Appointment): string[] {
  const fromList = (appointment.services ?? [])
    .map((service) => service.serviceName?.trim())
    .filter((name): name is string => Boolean(name));
  if (fromList.length > 0) return fromList;
  const legacy = appointment.serviceName?.trim();
  return legacy ? [legacy] : [];
}

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
  const localDate = dateToLocalInput(parsed).slice(0, 10);
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
function formatLocalStamp(localInput: string): string {
  return `${formatLongDate(localInput.slice(0, 10))} ${localInput.slice(11, 16)}`;
}
export interface EvolutionPrintDocumentProps {

  patientName: string;
  patientDocumentId?: string | null;
  appointments: Appointment[];
  totalAppointmentsCount?: number;

  records: Record<string, VisitRecordState>;
  partialNote?: string;
}
export function EvolutionPrintDocument({
  patientName,
  patientDocumentId,
  appointments,
  totalAppointmentsCount,
  records,
  partialNote,
}: EvolutionPrintDocumentProps) {
  const { name: clinicName } = useClinicBranding();
  const [mounted, setMounted] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  useEffect(() => {
    setMounted(true);
    setGeneratedAt(nowLocalInput());
    const refresh = () => setGeneratedAt(nowLocalInput());
    window.addEventListener("beforeprint", refresh);
    return () => window.removeEventListener("beforeprint", refresh);
  }, []);
  const ordered = useMemo(
    () => orderEvolutionAppointments(appointments),
    [appointments],
  );

  const registeredTotal =
    typeof totalAppointmentsCount === "number" ? totalAppointmentsCount : null;

  const truncated =
    (registeredTotal ?? appointments.length) === BACKEND_PAGE_CAP;
  if (!mounted) return null;
  const countText =
    ordered.length === 1
      ? "1 consulta incluida"
      : `${ordered.length} consultas incluidas`;
  const countLine =
    partialNote && registeredTotal !== null
      ? `${countText} de ${registeredTotal} citas registradas para el paciente`
      : countText;
  const document_ = (
    <div
      className={cn(
        "evolution-print hidden",
        truncated && "evolution-print--truncated",
        partialNote && "evolution-print--partial",
      )}
      aria-hidden="true"
    >

      <header className="evolution-print__header">
        <div className="evolution-print__header-main">
          <p className="evolution-print__header-patient">{patientName}</p>
          <p className="evolution-print__header-meta">
            {patientDocumentId?.trim()
              ? `Documento de identidad: ${patientDocumentId.trim()} · `
              : ""}
            Evolución clínica
          </p>
        </div>
        <div className="evolution-print__header-side">
          <p className="evolution-print__header-clinic">{clinicName}</p>
          {generatedAt ? (
            <p className="evolution-print__header-meta">
              Generado el {formatLocalStamp(generatedAt)}
            </p>
          ) : null}
        </div>
      </header>
      <footer className="evolution-print__footer">
        {partialNote ? (
          <p className="evolution-print__partial">{partialNote}</p>
        ) : null}
        <p>{SCOPE_STATEMENT}</p>
        {truncated ? <p>{TRUNCATION_STATEMENT}</p> : null}
      </footer>

      <table className="evolution-print__sheet">
        <thead>
          <tr>
            <td>
              <div className="evolution-print__reserve evolution-print__reserve--top" />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <section className="evolution-print__intro">
                <h1 className="evolution-print__title">
                  Evolución clínica registrada en este sistema
                </h1>
                <p className="evolution-print__intro-meta">{countLine}</p>
                {partialNote ? (
                  <p className="evolution-print__intro-meta">
                    Este documento es un EXTRACTO: incluye únicamente las
                    consultas seleccionadas en pantalla al generarlo, no todas
                    las que el sistema tiene registradas para el paciente. El
                    alcance exacto consta al pie de cada folio.
                  </p>
                ) : (
                  <p className="evolution-print__intro-meta">
                    Este documento incluye todas las consultas que el sistema
                    tiene registradas para el paciente: ignora cualquier filtro
                    o búsqueda aplicados en pantalla al generarlo.
                  </p>
                )}
              </section>
            </td>
          </tr>
          {ordered.length === 0 ? (
            <tr>
              <td>
                <p className="evolution-print__absence">
                  Este paciente no tiene consultas registradas en el sistema
                </p>
              </td>
            </tr>
          ) : (
            ordered.map((appointment, index) => (
              <tr key={appointment.id} className="evolution-print__row">
                <td>
                  <PrintedVisitEntry
                    appointment={appointment}
                    state={records[appointment.id] ?? { status: "idle" }}
                    position={index + 1}
                    total={ordered.length}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <div className="evolution-print__reserve evolution-print__reserve--bottom" />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
  return createPortal(document_, window.document.body);
}

function PrintedVisitEntry({
  appointment,
  state,
  position,
  total,
}: {
  appointment: Appointment;
  state: VisitRecordState;
  position: number;
  total: number;
}) {
  const typeLabel = appointment.type
    ? (APPOINTMENT_TYPE_LABEL[appointment.type] ?? appointment.type)
    : null;
  const serviceNames = collectServiceNames(appointment);
  return (
    <article className="evolution-print__entry">
      <div className="evolution-print__entry-head">
        <p className="evolution-print__entry-date">
          {formatLongDate(appointment.date)}
          {appointment.time ? (
            <>
              {" · "}
              <span className="evolution-print__entry-time">
                {appointment.time}
              </span>{" "}
              <span className="evolution-print__hint">(agendada)</span>
            </>
          ) : null}
        </p>
        <p className="evolution-print__hint">
          Consulta {position} de {total} en este documento
        </p>
      </div>
      <div className="evolution-print__chips">
        <span className="evolution-print__chip">
          {getVisitStatusLabel(appointment.status)}
        </span>
        {typeLabel ? (
          <span className="evolution-print__chip evolution-print__chip--soft">
            {typeLabel}
          </span>
        ) : null}
      </div>
      <p className="evolution-print__meta">
        Doctor de la cita:{" "}
        <span className="evolution-print__strong">
          {appointment.doctorName?.trim() || "Sin doctor asignado"}
        </span>
      </p>
      {serviceNames.length > 0 ? (
        <p className="evolution-print__meta">
          Servicios de la cita:{" "}
          <span className="evolution-print__strong">
            {serviceNames.join(" · ")}
          </span>
        </p>
      ) : null}
      <PrintedVisitBody appointment={appointment} state={state} />
    </article>
  );
}
function PrintedVisitBody({
  appointment,
  state,
}: {
  appointment: Appointment;
  state: VisitRecordState;
}) {

  if (state.status === "failed") {
    return (
      <p className="evolution-print__absence evolution-print__absence--alert">
        No se pudo cargar el registro de esta visita
        {state.message ? ` · ${state.message}` : ""}
      </p>
    );
  }
  if (state.status === "empty") {
    return <p className="evolution-print__absence">Sin registro de visita</p>;
  }
  if (state.status !== "ready") {
    return (
      <p className="evolution-print__absence evolution-print__absence--alert">
        El registro de esta visita no estaba disponible al generar el documento
      </p>
    );
  }
  return <PrintedRecordBands appointment={appointment} record={state.record} />;
}
function PrintedRecordBands({
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
    <div className="evolution-print__bands">
      {diagnoses.length > 0 ? (
        <section className="evolution-print__band">
          <h2 className="evolution-print__band-title">Diagnósticos</h2>
          <ul className="evolution-print__diagnoses">
            {diagnoses.map((diagnosis, index) => (
              <li key={`${diagnosis.code}-${index}`}>
                <span className="evolution-print__strong">
                  {diagnosis.code} — {resolveDiagnosisLabel(diagnosis)}
                </span>{" "}
                <span className="evolution-print__hint">
                  {diagnosis.status === "confirmed" ? "Confirmado" : "Provisional"}
                  {diagnosis.toothRef?.fdi
                    ? ` · Pieza ${diagnosis.toothRef.fdi}${
                        diagnosis.toothRef.surface
                          ? ` · ${diagnosis.toothRef.surface}`
                          : ""
                      }`
                    : ""}
                  {diagnosis.source === "odontogram"
                    ? " · derivado del odontograma"
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {chiefComplaint || painText ? (
        <section className="evolution-print__band">
          <h2 className="evolution-print__band-title">
            Motivo de consulta registrado
          </h2>
          {chiefComplaint ? (
            <p className="evolution-print__text">{chiefComplaint}</p>
          ) : null}
          {painText ? (
            <p className="evolution-print__meta">
              <span className="evolution-print__strong">Dolor:</span> {painText}
            </p>
          ) : null}
        </section>
      ) : null}
      {extraoral.length > 0 || intraoral.length > 0 ? (
        <section className="evolution-print__band">
          <h2 className="evolution-print__band-title">Hallazgos del examen</h2>
          {extraoral.length > 0 ? (
            <PrintedFindings title="Extraoral" rows={extraoral} />
          ) : null}
          {intraoral.length > 0 ? (
            <PrintedFindings title="Intraoral" rows={intraoral} />
          ) : null}
        </section>
      ) : null}
      <section className="evolution-print__band">
        <h2 className="evolution-print__band-title">Nota de evolución</h2>
        {notes ? (
          <div
            className="prose prose-sm evolution-print__note"
            dangerouslySetInnerHTML={{ __html: notes }}
          />
        ) : (
          <p className="evolution-print__absence">
            Sin nota de evolución registrada
          </p>
        )}
      </section>
      <PrintedStamp appointment={appointment} record={record} />
    </div>
  );
}
function PrintedFindings({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="evolution-print__findings">
      <p className="evolution-print__findings-title">{title}</p>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="evolution-print__findings-row">
            <dt>{row.label}:</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
function PrintedStamp({
  appointment,
  record,
}: {
  appointment: Appointment;
  record: PatientVisitRecord;
}) {
  const author = resolveAuthorship(record.clinicalNotesUpdatedBy);
  const stamp = parseStamp(record.clinicalNotesUpdatedAt);
  const annotatedLate = Boolean(stamp && stamp.localDate > appointment.date);
  return (
    <div className="evolution-print__stamp">

      {author ? (
        <p>
          Última edición: <span className="evolution-print__strong">{author}</span>
          {stamp ? ` · ${stamp.text}` : ""}
        </p>
      ) : stamp ? (
        <p>
          <span className="evolution-print__absence">{NO_AUTHORSHIP_LABEL}</span> ·{" "}
          {stamp.text}
        </p>
      ) : (
        <p className="evolution-print__absence">{NO_AUTHORSHIP_LABEL}</p>
      )}
      {annotatedLate && stamp ? (
        <p>
          Anotada después de la fecha de la consulta ·{" "}
          {formatLongDate(stamp.localDate)}
        </p>
      ) : null}
    </div>
  );
}
export default EvolutionPrintDocument;
