/**
 * Elegibilidad y formato de las visitas navegables del odontograma.
 *
 * Fuente ÚNICA de la regla "¿qué citas son visitas consultables?". Antes vivía
 * duplicada: el anfitrión montaba la navegación con `appointments.length > 1`
 * y el componente decidía por su cuenta con `points.length < 2` tras filtrar
 * por status — con 3 citas canceladas + 1 activa se montaba algo que no
 * pintaba nada. Cualquier consumidor nuevo debe usar este helper, no rehacer
 * el filtro.
 *
 * Las fechas se parsean SIEMPRE con `parseLocalValue`: `Appointment.date` es
 * 'YYYY-MM-DD' y `new Date('YYYY-MM-DD')` se interpreta en UTC, así que en
 * husos negativos (es-VE, UTC−4) se imprimía el día anterior.
 */

import {
  MONTHS_ES,
  WEEKDAYS_ES_MON,
  mondayFirstWeekday,
  parseLocalValue,
} from "@/lib/datetime";
import type { Appointment } from "@/lib/entity/appointment/appointments";

export interface EligibleVisit {
  appointmentId: string;
  /** Fecha tal como la entrega el backend: 'YYYY-MM-DD'. */
  date: string;
  /** Fecha parseada en zona LOCAL (null si el backend mandó algo inválido). */
  parsedDate: Date | null;
  /** Es la consulta activa — la que el usuario está atendiendo ahora. */
  isActive: boolean;
  /** Posición 1-based dentro del historial completo, de la más antigua a la más reciente. */
  index: number;
  reason?: string;
  serviceName?: string;
  doctorName?: string;
}

/**
 * Citas que representan una visita clínica consultable, de la más ANTIGUA a la
 * más reciente. Se incluyen las completadas, las en curso y la consulta activa
 * (que puede estar `scheduled` y aún así ser la que se está atendiendo).
 */
export function getEligibleVisits(
  appointments: Appointment[] | undefined,
  activeAppointmentId?: string,
): EligibleVisit[] {
  if (!appointments?.length) return [];

  const eligible = appointments.filter(
    (a) =>
      a.status === "completed" ||
      a.status === "in_progress" ||
      a.id === activeAppointmentId,
  );

  // Orden por fecha + hora: dos visitas del mismo día deben quedar en el orden
  // en que ocurrieron, no en el que llegaron del backend.
  const sorted = [...eligible].sort((a, b) => {
    const keyA = `${a.date ?? ""}T${a.time ?? "00:00"}`;
    const keyB = `${b.date ?? ""}T${b.time ?? "00:00"}`;
    return keyA.localeCompare(keyB);
  });

  return sorted.map((a, idx) => ({
    appointmentId: a.id,
    date: a.date,
    parsedDate: parseLocalValue(a.date),
    isActive: !!activeAppointmentId && a.id === activeAppointmentId,
    index: idx + 1,
    reason: a.reason,
    serviceName: a.serviceName ?? a.services?.[0]?.serviceName,
    doctorName: a.doctorName,
  }));
}

/**
 * Fecha LOCAL de una cita cualquiera, sea o no una visita elegible.
 *
 * El historial puede abrirse desde el drawer de visitas con una cita que el
 * filtro de elegibilidad no incluye (una cancelada, por ejemplo). Etiquetar ese
 * registro como "fecha no disponible" sería peor que mostrar su fecha real:
 * la fecha ES la identidad del registro clínico que se está viendo.
 */
export function findAppointmentDate(
  appointments: Appointment[] | undefined,
  appointmentId: string | undefined,
): Date | null {
  if (!appointments?.length || !appointmentId) return null;
  const match = appointments.find((a) => a.id === appointmentId);
  return match ? parseLocalValue(match.date) : null;
}

/** Mes abreviado en español: 'mar', 'sep'. */
function shortMonth(date: Date): string {
  return MONTHS_ES[date.getMonth()].slice(0, 3).toLowerCase();
}

/** Día de la semana abreviado en español: 'jue'. */
function shortWeekday(date: Date): string {
  return WEEKDAYS_ES_MON[mondayFirstWeekday(date)].toLowerCase();
}

/**
 * Etiqueta de fecha de una visita.
 * - `{ weekday: true }` → "jue 12 mar 2026" (filas del panel)
 * - por defecto        → "12 mar 2026" (píldora y chip)
 */
export function formatVisitDate(
  date: Date | null,
  options: { weekday?: boolean; year?: boolean } = {},
): string {
  if (!date) return "Fecha no disponible";
  const { weekday = false, year = true } = options;
  const parts: string[] = [];
  if (weekday) parts.push(shortWeekday(date));
  parts.push(String(date.getDate()).padStart(2, "0"));
  parts.push(shortMonth(date));
  if (year) parts.push(String(date.getFullYear()));
  return parts.join(" ");
}

/** Fecha larga para lectores de pantalla y avisos: "12 de marzo de 2026". */
export function formatVisitDateLong(date: Date | null): string {
  if (!date) return "fecha no disponible";
  return `${date.getDate()} de ${MONTHS_ES[
    date.getMonth()
  ].toLowerCase()} de ${date.getFullYear()}`;
}

/** Motivo · profesional — la segunda línea de la fila del panel. */
export function formatVisitSubtitle(visit: EligibleVisit): string {
  return [visit.reason || visit.serviceName, visit.doctorName]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Cadena que cmdk usa para filtrar. Empaqueta todas las formas en que un
 * clínico buscaría la visita (fecha larga y numérica, mes escrito, motivo,
 * profesional) y termina con el id, que garantiza unicidad: dos visitas del
 * mismo día con el mismo motivo colapsarían en cmdk si compartieran `value`.
 */
export function buildVisitSearchValue(visit: EligibleVisit): string {
  const date = visit.parsedDate;
  const parts = [
    formatVisitDate(date, { weekday: true }),
    date
      ? `${String(date.getDate()).padStart(2, "0")}/${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}/${date.getFullYear()}`
      : "",
    date ? MONTHS_ES[date.getMonth()] : "",
    visit.reason ?? "",
    visit.serviceName ?? "",
    visit.doctorName ?? "",
    visit.appointmentId,
  ];
  return parts.filter(Boolean).join(" ");
}
