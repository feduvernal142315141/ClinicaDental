"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/utils";
import { MONTHS_ES, dateToLocalInput, nowLocalInput } from "@/lib/datetime";
import { CIE10_DENTAL_CODES } from "@/lib/entity/clinical-history/cie10-dental";
// Misma normalización de autoría que la tarjeta y el drawer. El papel tenía su
// propia copia y divergió: imprimía la ausencia de autor SIN la fecha.
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COPIA IMPRESA DE LA EVOLUCIÓN CLÍNICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * No es una función opcional. Cinco jurisdicciones reconocen el derecho del
 * paciente a obtener copia de su historia clínica —Bolivia NT-64 art. 23,
 * Colombia Res. 1995/1999, México NOM-004-SSA3-2012, Argentina Ley 26.529,
 * España Ley 41/2002— y Bolivia exige además que la copia vaya identificada
 * "en cada uno de sus folios". De ahí la cabecera fija (paciente + clínica)
 * que se repite en cada página, y el pie fijo con las declaraciones de alcance.
 *
 * ── REGLAS QUE ESTE DOCUMENTO NO PUEDE ROMPER ──────────────────────────────
 * 1. Dice EXACTAMENTE lo mismo que la pantalla. Los tres estados de ausencia
 *    (sin registro / con registro pero sin nota / fallo técnico) se imprimen
 *    distinguidos, igual que en `VisitEntryCard`. Un fallo de carga jamás se
 *    imprime como "sin nota".
 * 2. DECLARA SU ALCANCE en su propio cuerpo. La copia completa ignora cualquier
 *    filtro activo en pantalla y lo dice; el extracto (el host manda entonces
 *    `partialNote`) declara el recorte en vez de afirmar completitud, y el pie
 *    lo repite folio a folio. Un export selectivo silencioso es peor que uno
 *    que declara su recorte: quien recibe el papel no puede saber qué se quedó
 *    fuera.
 * 3. La hora va rotulada "agendada". El DTO del listado no trae la hora real
 *    de atención (`actualStartAt` no viaja), así que presentar la hora de
 *    agenda como hora de atención sería falso en un documento clínico-legal.
 * 4. El pie de cada asiento sólo puede afirmar la ÚLTIMA EDICIÓN. No existe
 *    "Autor", "Escrito por", "Firmado", "Validado", "Enmendada" ni "Addendum",
 *    porque el backend sobreescribe la nota y no guarda versiones. Cuando no
 *    hay constancia, se imprime "Sin registro de autoría" — nunca se cae a
 *    `doctorName`, que es una asignación de agenda, no prueba de autoría.
 * 5. Ni un solo importe. Esta es la historia clínica, no la cuenta.
 *
 * ── POR QUÉ UN PORTAL A `document.body` ────────────────────────────────────
 * La vista vive dentro de contenedores con `overflow` (ADR-36: una sola
 * superficie con scroll) y bajo `html { overflow: hidden }`. Un documento
 * impreso renderizado in-situ se recortaría a la caja de su ancestro y saldría
 * una sola página truncada. Como hijo directo de `body`, el CSS de impresión
 * puede ocultar todo lo demás con una regla de un renglón y este árbol fluye
 * en páginas completas.
 *
 * Se monta sólo tras `useEffect` (nunca en SSR): sin HTML de servidor no hay
 * desajuste de hidratación con la fecha de generación. Y una vez montado NO se
 * desmonta: la vista previa de Chrome re-rasteriza desde el DOM vivo cada vez
 * que se cambia papel, escala o márgenes, así que un montaje condicional daría
 * una previa en blanco. Lo que decide si el papel es este documento o la
 * aplicación es la marca `data-print-active` que pone `useEvolutionPrint` justo
 * antes de abrir el diálogo — sin ella, el CSS de impresión no apaga nada y un
 * Ctrl+P imprime la pantalla como en cualquier otra vista.
 */

/** Tope que el backend aplica al listado; es la única señal de truncamiento. */
const BACKEND_PAGE_CAP = 100;

/** Declaraciones de alcance del pie. Texto legal: no reescribir a la ligera. */
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

// ---------------------------------------------------------------------------
// Helpers duplicados de `VisitEntryCard`
//
// Están copiados a propósito y NO deben divergir: son las cadenas que la ley
// obliga a que digan lo mismo en pantalla y en papel. `VisitEntryCard` no las
// exporta y no se toca en este cambio; si alguna vez se extraen a un módulo
// compartido, hay que mover LAS DOS copias a la vez.
// ---------------------------------------------------------------------------

const CIE10_LABEL_BY_CODE: Map<string, string> = new Map(
  CIE10_DENTAL_CODES.map((entry) => [entry.code.toUpperCase(), entry.label]),
);

/** Un código CIE-10 desnudo no lo lee nadie que no lo tenga memorizado. */
function resolveDiagnosisLabel(diagnosis: VisitDiagnosis): string {
  const own = diagnosis.label?.trim();
  if (own) return own;
  const fromCatalog = CIE10_LABEL_BY_CODE.get(
    diagnosis.code?.trim().toUpperCase() ?? "",
  );
  if (fromCatalog) return fromCatalog;
  return "Sin descripción en el catálogo";
}

/** Frase completa: "Finalizada" a secas podría leerse como estado de la NOTA. */
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

/**
 * Servicios que constan en la cita. Sólo el NOMBRE: `serviceCost` y
 * `serviceCode` viajan en el mismo objeto y ninguno de los dos entra en la
 * historia clínica (regla 5). `serviceName` singular es el campo legacy —el
 * primer elemento de `services`—, así que sólo se usa si la lista no da nada.
 */
function collectServiceNames(appointment: Appointment): string[] {
  const fromList = (appointment.services ?? [])
    .map((service) => service.serviceName?.trim())
    .filter((name): name is string => Boolean(name));
  if (fromList.length > 0) return fromList;
  const legacy = appointment.serviceName?.trim();
  return legacy ? [legacy] : [];
}

/** Fecha larga en español a partir de "YYYY-MM-DD" (sin `new Date(str)`: eso es UTC). */
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

/** "2026-09-05T14:07" → "5 de septiembre de 2026 14:07" (hora LOCAL). */
function formatLocalStamp(localInput: string): string {
  return `${formatLongDate(localInput.slice(0, 10))} ${localInput.slice(11, 16)}`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface EvolutionPrintDocumentProps {
  /** Nombre del paciente. Va en la cabecera de CADA folio. */
  patientName: string;
  /**
   * Documento de identidad del paciente, si el sistema lo tiene. Hoy la entidad
   * `Patient` no lo modela, así que llega `undefined` y la línea no se imprime:
   * antes que inventar un identificador, el folio se identifica por nombre.
   */
  patientDocumentId?: string | null;
  /**
   * Citas que componen ESTE documento. Con un alcance recortado ("Imprimir
   * selección") llega ya filtrado, así que su longitud no dice cuántas
   * consultas tiene el paciente: para eso está `totalAppointmentsCount`.
   */
  appointments: Appointment[];
  /**
   * Citas que devolvió el backend para el paciente, SIN filtrar por la UI. Es lo
   * único que permite saber (a) que el listado llegó al tope del backend y hay
   * consultas anteriores sin listar y (b) de cuántas consultas es este extracto.
   * Contar `appointments` para eso diría "3 de 3" en un documento parcial.
   */
  totalAppointmentsCount?: number;
  /** Estados de carga por cita, tal como los deja `useEvolutionPrint`. */
  records: Record<string, VisitRecordState>;
  /**
   * Declaración de que este documento es un EXTRACTO y no la copia completa de
   * la historia clínica. Va en el pie de cada folio, junto a las demás
   * declaraciones de alcance: un extracto que no se declara como tal se lee como
   * el expediente entero, y eso es justo lo que las normas de historia clínica
   * persiguen.
   */
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

  // Portal + fecha de generación son cliente puro: sin esto habría desajuste de
  // hidratación (la hora del servidor nunca es la de la clínica).
  const [mounted, setMounted] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setGeneratedAt(nowLocalInput());
    // La marca se refresca justo antes de abrir el diálogo: un documento
    // preparado a las 9:00 e impreso a las 11:00 diría una hora que no es.
    const refresh = () => setGeneratedAt(nowLocalInput());
    window.addEventListener("beforeprint", refresh);
    return () => window.removeEventListener("beforeprint", refresh);
  }, []);

  const ordered = useMemo(
    () => orderEvolutionAppointments(appointments),
    [appointments],
  );

  // Sin el total sin filtrar no se puede afirmar ningún denominador: el array
  // que llega puede venir ya recortado por el alcance elegido.
  const registeredTotal =
    typeof totalAppointmentsCount === "number" ? totalAppointmentsCount : null;

  // El backend descarta la metadata de paginación: que el listado COMPLETO
  // llegue justo al tope es lo único de lo que se deduce que hay consultas
  // anteriores sin listar. Medirlo sobre las citas ya filtradas perdía el aviso
  // en cuanto el documento se imprimía con un alcance recortado.
  const truncated =
    (registeredTotal ?? appointments.length) === BACKEND_PAGE_CAP;

  if (!mounted) return null;

  const countText =
    ordered.length === 1
      ? "1 consulta incluida"
      : `${ordered.length} consultas incluidas`;
  // Con recorte, el recuento lleva su denominador: "2 consultas incluidas" a
  // secas no deja ver de cuánto es el extracto. Se dice "citas registradas"
  // porque el total sin filtrar incluye las canceladas, que este documento no
  // imprime (así lo declara el pie).
  const countLine =
    partialNote && registeredTotal !== null
      ? `${countText} de ${registeredTotal} citas registradas para el paciente`
      : countText;

  const document_ = (
    <div
      className={cn(
        // Oculto en pantalla. En el papel sólo aparece cuando la impresión la
        // ha disparado esta ficha: la marca `data-print-active` que pone
        // `useEvolutionPrint` es lo que enciende su CSS. Sin ella, un Ctrl+P
        // del usuario imprime la aplicación, no este documento a medio cargar.
        "evolution-print hidden",
        truncated && "evolution-print--truncated",
        partialNote && "evolution-print--partial",
      )}
      // Duplica en papel lo que ya está en la pantalla: fuera del árbol de
      // accesibilidad para no leerlo dos veces.
      aria-hidden="true"
    >
      {/* ── Cabecera fija: identificación en CADA folio ─────────────────── */}
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

      {/* ── Pie fijo: declaraciones de alcance en CADA folio ────────────── */}
      <footer className="evolution-print__footer">
        {partialNote ? (
          <p className="evolution-print__partial">{partialNote}</p>
        ) : null}
        <p>{SCOPE_STATEMENT}</p>
        {truncated ? <p>{TRUNCATION_STATEMENT}</p> : null}
      </footer>

      {/*
        La tabla NO es maquetación decorativa: `thead`/`tfoot` se repiten en
        cada folio y son lo único que RESERVA la banda que ocupan la cabecera y
        el pie fijos. Sin ellas, a partir de la segunda página el texto pasaría
        por debajo de la identificación del paciente. Cada asiento es una fila,
        para que `break-inside: avoid` actúe asiento a asiento.
      */}
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
                {/* Declaración obligatoria de alcance. En la copia completa
                    dice qué recorte NO se aplicó; en el extracto NO puede
                    seguir afirmando completitud mientras su propio pie declara
                    lo contrario, así que declara el recorte y remite al pie,
                    que es donde el aviso va folio a folio (ADR-68). */}
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

// ---------------------------------------------------------------------------
// Un asiento impreso
// ---------------------------------------------------------------------------

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
              {/* Rótulo obligatorio: es la hora de AGENDA, no la de atención. */}
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

      {/* "Doctor de la cita" es literal: asignación de AGENDA, no constancia de
          quién atendió ni de quién escribió la nota. */}
      <p className="evolution-print__meta">
        Doctor de la cita:{" "}
        <span className="evolution-print__strong">
          {appointment.doctorName?.trim() || "Sin doctor asignado"}
        </span>
      </p>

      {/* Mismo registro que la línea de arriba: lo que consta AGENDADO en la
          cita. No dice "procedimiento realizado" ni "tratamiento efectuado"
          porque el listado no prueba ejecución; sin esta línea, en cambio, una
          endodoncia sin nota escrita salía en la copia legal diciendo sólo
          "Sin nota de evolución registrada". Sin importes: regla 5. */}
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
  // Los tres estados de ausencia, distinguidos igual que en pantalla.
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
    // `idle` = nadie llegó a pedir ese registro. El hook resuelve el ALCANCE que
    // se le pasó, que no tiene por qué ser lo que este documento pinta: si las
    // dos listas divergen —una selección que sigue cambiando mientras se
    // prepara— el asiento cae aquí. Se dice lo que pasó; jamás se deja en
    // blanco ni se rotula "sin nota", que afirmaría algo falso del paciente.
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
          {/* Sin comillas y sin atribuirlo al paciente: el backend lo siembra
              desde las notas de la cita, que puede haber escrito recepción. */}
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
          // ÍNTEGRA: en papel no hay "ver más", así que no hay plegado ni
          // truncamiento posible. El HTML llega ya saneado del servidor.
          <div
            className="prose prose-sm evolution-print__note"
            dangerouslySetInnerHTML={{ __html: notes }}
          />
        ) : (
          // Hay registro, pero nadie escribió la evolución. No es un fallo.
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

/**
 * Pie de sello del asiento. Sólo puede afirmar la ÚLTIMA EDICIÓN: el backend
 * sobreescribe la nota y no guarda versiones ni auditoría. Aquí no hay autor,
 * ni firma, ni validación, ni historial — y no se inventa ninguno.
 */
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
      {/* La fecha NO cuelga de que haya autor. "anonymous" (o vacío) es ausencia
          de constancia de AUTORÍA, no ausencia de edición, y el sello de tiempo
          sigue siendo un dato real del registro: descartarlo en el papel —que es
          la copia que sale de la clínica— borraría un dato que sí existe. Las
          tres ramas son las mismas que las de la tarjeta en pantalla, a
          propósito: si divergen, papel y pantalla afirman cosas distintas sobre
          el mismo hecho registral. */}
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
