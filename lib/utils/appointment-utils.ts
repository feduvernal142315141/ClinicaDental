/**
 * APPOINTMENT UTILITIES
 *
 * Funciones helper reutilizables para el manejo de appointments
 * Centraliza lógica repetida en calendar-view, appointment-details, patient-details
 */

import dayjs, { type Dayjs } from "dayjs";
import { dateToLocalDate } from "@/lib/datetime";
import { Appointment } from "@/lib/entity/appointment/appointments";
import type { DaySchedule, WeekSchedule } from "@/lib/entity/schedule";
import { DAYS_OF_WEEK } from "@/lib/entity/schedule";
import type { ClinicSchedule, ClinicScheduleDay } from "@/lib/entity/settings";
import { isClinicDayOpen, isTime } from "@/lib/utils/schedule-bounds";

/**
 * Obtiene las clases CSS para el badge de estado de appointment
 */
export function getAppointmentStatusColor(
  status: Appointment["status"],
): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "no-show":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Obtiene el texto legible del estado de appointment
 */
export function getAppointmentStatusText(
  status: Appointment["status"],
): string {
  switch (status) {
    case "scheduled":
      return "Programada";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    case "no-show":
      return "No asistió";
    default:
      return status;
  }
}

/**
 * Formatea una fecha para mostrar en formato largo español
 */
export function formatAppointmentDate(date: Date | string): string {
  const dateObj =
    typeof date === "string" ? new Date(date + "T00:00:00") : date;

  return dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formatea un mes y año para el header del calendario
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Convierte una fecha a 'YYYY-MM-DD' usando componentes LOCALES (regla de oro).
 * No usar toISOString(): convertiría a UTC y produciría off-by-one cerca de
 * medianoche en zonas con desfase horario.
 */
export function toISODateString(date: Date): string {
  return dateToLocalDate(date);
}

/**
 * Verifica si una fecha es hoy
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Mapping from dayjs day index (0=Sunday) to WeekSchedule keys.
 */
const DAY_INDEX_TO_KEY: Record<number, keyof WeekSchedule> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

// ---------------------------------------------------------------------------
// Temporal utilities
// ---------------------------------------------------------------------------

/**
 * Parsea la fecha (YYYY-MM-DD) y hora (HH:mm) de una cita en un objeto Date local.
 */
export function getAppointmentStartAt(appointment: Appointment): Date {
  const [h, m] = (appointment.time || "00:00").split(":").map(Number);
  const d = new Date(appointment.date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Calcula la fecha/hora de fin de una cita sumando su duración.
 */
export function getAppointmentEndAt(appointment: Appointment): Date {
  const start = getAppointmentStartAt(appointment);
  return new Date(start.getTime() + (appointment.duration || 0) * 60_000);
}

/**
 * Retorna true si la cita está programada Y aún no ha iniciado (se puede modificar).
 */
export function isAppointmentActionable(appointment: Appointment): boolean {
  if (appointment.status !== "scheduled") return false;
  return getAppointmentStartAt(appointment) > new Date();
}

export type AppointmentTemporalCategory =
  | "all"
  | "today"
  | "future"
  | "past"
  | "completed";

/**
 * Categoriza una cita en función de su estado y fecha de inicio.
 * - completed → "completed"
 * - date es hoy → "today"
 * - date es futuro → "future"
 * - date es pasado (o ya cancelada) → "past"
 */
export function getTemporalCategory(
  appointment: Appointment,
): AppointmentTemporalCategory {
  if (appointment.status === "completed") return "completed";

  const today = dayjs().startOf("day");
  const apptDate = dayjs(appointment.date + "T00:00:00").startOf("day");

  if (apptDate.isSame(today, "day")) return "today";
  if (apptDate.isAfter(today, "day")) return "future";
  return "past";
}

/**
 * Construye una función `disabledDate` para DatePicker / Calendar de Ant Design
 * basándose en el schedule semanal del doctor.
 *
 * Deshabilita:
 *  - Fechas anteriores a hoy
 *  - Días de la semana donde el doctor no trabaja (enabled === false)
 *  - Días donde la CLÍNICA no abre, o donde el rango del doctor no solapa
 *    con el rango de la clínica (horario EFECTIVO doctor ∩ clínica, en
 *    paridad con `AppointmentSchedulePolicyService.resolveEffectiveSchedule`
 *    del backend).
 *
 * Si no se proporciona schedule, solo deshabilita fechas pasadas.
 */
type ScheduleLike = WeekSchedule | Record<string, unknown> | undefined | null;

/**
 * Horario de la clínica tal cual lo expone `useClinicGeneralSettings().rawSchedule`:
 * parcial (días no configurados AUSENTES). `undefined`/`null` ⇒ aún no cargó
 * (degradar al comportamiento legacy, solo horario del doctor).
 */
type ClinicScheduleLike =
  | Partial<ClinicSchedule>
  | Record<string, unknown>
  | undefined
  | null;

/** Devuelve el DaySchedule del día correspondiente a `date`, o undefined. */
function getDayScheduleFor(
  schedule: ScheduleLike,
  date: Dayjs,
): DaySchedule | undefined {
  if (!schedule) return undefined;
  const dayKey = DAY_INDEX_TO_KEY[date.day()];
  if (!dayKey) return undefined;
  const day = (schedule as Record<string, unknown>)[dayKey];
  return day && typeof day === "object" ? (day as DaySchedule) : undefined;
}

/** Devuelve el ClinicScheduleDay del día `dayKey`, o undefined si está ausente. */
function getClinicDayFor(
  clinicSchedule: ClinicScheduleLike,
  dayKey: keyof WeekSchedule,
): ClinicScheduleDay | undefined {
  if (!clinicSchedule) return undefined;
  const day = (clinicSchedule as Record<string, unknown>)[dayKey];
  return day && typeof day === "object" ? (day as ClinicScheduleDay) : undefined;
}

/** `true` si los rangos [aStart,aEnd) y [bStart,bEnd) se solapan. */
function hasScheduleOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Día EFECTIVO (doctor ∩ clínica) para un día de la semana dado. Paridad con
 * `AppointmentSchedulePolicyService.resolveEffectiveSchedule` del backend:
 * - El doctor debe atenderlo (`enabled !== false`).
 * - Sin horario de clínica cargado aún (`clinicSchedule` ausente por completo)
 *   ⇒ permisivo, se conserva el comportamiento legacy (solo doctor) para no
 *   sobre-deshabilitar mientras carga.
 * - Día AUSENTE del horario de la clínica (nunca configurado) ⇒ permisivo,
 *   igual que el backend trata `clinicDaySchedule == null` (usa solo horario
 *   del doctor, sin acotar).
 * - Día PRESENTE en el horario de la clínica: la clínica debe abrir ese día
 *   con horas válidas (`isClinicDayOpen`) y el rango del doctor debe solapar
 *   con el de la clínica; si no, el día queda bloqueado (igual que el backend
 *   devuelve `Optional.empty()`). Si el doctor no tiene horas válidas, no se
 *   acota por rango (solo por día).
 */
function isEffectiveWorkingDay(
  day: DaySchedule | undefined,
  clinicSchedule: ClinicScheduleLike,
  dayKey: keyof WeekSchedule,
): boolean {
  if (!day || day.enabled === false) return false;
  if (!clinicSchedule) return true;

  const clinicDay = getClinicDayFor(clinicSchedule, dayKey);
  if (clinicDay === undefined) return true;
  if (!isClinicDayOpen(clinicDay)) return false;

  if (!isTime(day.startTime) || !isTime(day.endTime)) return true;

  return hasScheduleOverlap(
    day.startTime,
    day.endTime,
    clinicDay.startTime as string,
    clinicDay.endTime as string,
  );
}

/**
 * Indica si el doctor atiende en la fecha dada según su horario semanal.
 * Un día se considera laboral si existe en el schedule y `enabled !== false`
 * (compatibilidad legacy: presencia sin `enabled` ⇒ habilitado).
 *
 * Si se pasa `clinicSchedule`, el resultado es el horario EFECTIVO (doctor ∩
 * clínica): ver `isEffectiveWorkingDay`.
 */
export function isDoctorWorkingDay(
  schedule: ScheduleLike,
  date: Dayjs,
  clinicSchedule?: ClinicScheduleLike,
): boolean {
  const dayKey = DAY_INDEX_TO_KEY[date.day()];
  if (!dayKey) return false;
  const day = getDayScheduleFor(schedule, date);
  return isEffectiveWorkingDay(day, clinicSchedule, dayKey);
}

export function buildDisabledDate(
  schedule: ScheduleLike,
  clinicSchedule?: ClinicScheduleLike,
): (current: Dayjs) => boolean {
  return (current: Dayjs): boolean => {
    if (!current) return false;

    // Deshabilitar fechas anteriores a hoy
    if (current.isBefore(dayjs(), "day")) {
      return true;
    }

    // Sin schedule cargado aún: no sobre-deshabilitar (solo fechas pasadas).
    if (!schedule) return false;

    // El doctor no atiende ese día, o la clínica está cerrada ese día → deshabilitado.
    return !isDoctorWorkingDay(schedule, current, clinicSchedule);
  };
}

export interface DoctorScheduleSummary {
  workingDays: { key: string; short: string }[];
  range?: { start: string; end: string };
  break?: { start: string; end: string };
}

/**
 * Construye un resumen legible del horario del doctor para mostrar como chip:
 * días que atiende + un rango representativo + descanso si aplica.
 *
 * Si se pasa `clinicSchedule`, los días mostrados son los EFECTIVOS (doctor ∩
 * clínica): un día donde la clínica está cerrada, o cuyo rango no solapa con
 * el de la clínica, no aparece como "Atiende".
 */
export function getDoctorScheduleSummary(
  schedule: ScheduleLike,
  clinicSchedule?: ClinicScheduleLike,
): DoctorScheduleSummary | null {
  if (!schedule) return null;
  const source = schedule as Record<string, DaySchedule | undefined>;

  const workingDays: { key: string; short: string }[] = [];
  let range: { start: string; end: string } | undefined;
  let brk: { start: string; end: string } | undefined;

  for (const { key, shortLabel } of DAYS_OF_WEEK) {
    const day = source[key];
    if (isEffectiveWorkingDay(day, clinicSchedule, key)) {
      workingDays.push({ key, short: shortLabel });
      if (!range && day?.startTime && day?.endTime) {
        range = { start: day.startTime, end: day.endTime };
      }
      if (!brk && day?.breakStart && day?.breakEnd) {
        brk = { start: day.breakStart, end: day.breakEnd };
      }
    }
  }

  return { workingDays, range, break: brk };
}
