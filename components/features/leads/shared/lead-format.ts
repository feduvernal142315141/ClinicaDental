/**
 * Formato de fechas de "Adquisición de pacientes". El backend envía instantes ISO-8601 en UTC;
 * aquí siempre se muestran en la hora local del navegador.
 */

const DATE = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const RELATIVE = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "07 oct 2026". */
export function formatLeadDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE.format(date) : "—";
}

/** "07 oct 2026, 14:30" (hora local, 24 h). */
export function formatLeadDateTime(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE_TIME.format(date) : "—";
}

/** "hace 3 horas", "ayer", "dentro de 2 días". Más de 30 días → fecha. */
export function formatLeadRelative(value: string | null | undefined, now = Date.now()): string {
  const date = parse(value);
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "ahora";
  if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return RELATIVE.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return RELATIVE.format(Math.round(seconds / 86_400), "day");
  return DATE.format(date);
}

/** Fecha de calendario `YYYY-MM-DD` (cita) sin conversión de zona: "12 oct 2026". */
export function formatLeadCalendarDate(value: string | null | undefined): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return "—";
  return DATE.format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
