/**
 * Formato de fechas de Finanzas.
 * - Instantes (`createdAt`, `paidAt`…) llegan en ISO UTC y se muestran en hora local.
 * - Fechas de calendario (`validUntil`, `dueDate`…) llegan como "YYYY-MM-DD" y NO se convierten
 *   de zona (un `new Date("2026-10-01")` sería UTC y podría mostrar el día anterior).
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
const TIME = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", hour12: false });
const DAY_MONTH = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });

function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const calendar = parseCalendarDate(value);
  if (calendar) return calendar;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "01 oct 2026" — acepta "YYYY-MM-DD" o ISO. */
export function formatBillingDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE.format(date) : "—";
}

/** "01 oct 2026, 14:30" (hora local, 24 h). */
export function formatBillingDateTime(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE_TIME.format(date) : "—";
}

/** "14:30" (hora local, 24 h). */
export function formatBillingTime(value: string | null | undefined): string {
  const date = parse(value);
  return date ? TIME.format(date) : "—";
}

/** "01/10" — para "Cita del DD/MM". */
export function formatDayMonth(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DAY_MONTH.format(date) : "—";
}
