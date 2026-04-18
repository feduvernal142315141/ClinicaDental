/**
 * APPOINTMENT UTILITIES
 *
 * Funciones helper reutilizables para el manejo de appointments
 * Centraliza lógica repetida en calendar-view, appointment-details, patient-details
 */

import dayjs, { type Dayjs } from "dayjs";
import { Appointment } from "@/lib/entity/appointment/appointments";
import type { WeekSchedule } from "@/lib/entity/schedule";

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
 * Convierte una fecha a formato ISO string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
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
 *
 * Si no se proporciona schedule, solo deshabilita fechas pasadas.
 */
export function buildDisabledDate(
  schedule: WeekSchedule | Record<string, unknown> | undefined | null,
): (current: Dayjs) => boolean {
  return (current: Dayjs): boolean => {
    if (!current) return false;

    // Deshabilitar fechas anteriores a hoy
    if (current.isBefore(dayjs(), "day")) {
      return true;
    }

    // Si hay schedule, deshabilitar días donde el doctor no trabaja
    if (schedule) {
      const dayKey = DAY_INDEX_TO_KEY[current.day()];
      if (dayKey) {
        const daySchedule = (schedule as Record<string, unknown>)[dayKey];
        if (
          daySchedule &&
          typeof daySchedule === "object" &&
          "enabled" in daySchedule &&
          (daySchedule as { enabled: boolean }).enabled === false
        ) {
          return true;
        }
      }
    }

    return false;
  };
}
