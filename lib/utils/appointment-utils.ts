/**
 * APPOINTMENT UTILITIES
 *
 * Funciones helper reutilizables para el manejo de appointments
 * Centraliza lógica repetida en calendar-view, appointment-details, patient-details
 */

import { Appointment } from "@/lib/entity/appointment/appointments";

/**
 * Obtiene las clases CSS para el badge de estado de appointment
 */
export function getAppointmentStatusColor(
  status: Appointment["status"]
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
  status: Appointment["status"]
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
