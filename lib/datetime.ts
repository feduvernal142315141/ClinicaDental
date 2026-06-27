/**
 * datetime.ts — Helpers de fecha/hora con REGLA DE ORO:
 *
 *   Los inputs trabajan SIEMPRE en hora LOCAL del usuario.
 *   La conversión a ISO UTC ocurre SOLO al enviar al backend.
 *   Nunca usar `new Date().toISOString().slice(0,16)` (eso da UTC = hora equivocada).
 *
 * Formatos:
 *   - fecha-hora local:  'YYYY-MM-DDTHH:mm'
 *   - solo fecha local:  'YYYY-MM-DD'
 *   - al backend:        ISO UTC ('…Z')
 */

const pad = (n: number): string => String(n).padStart(2, "0");

/** Date → 'YYYY-MM-DDTHH:mm' (componentes LOCALES). */
export function dateToLocalInput(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Date → 'YYYY-MM-DD' (componentes LOCALES). */
export function dateToLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ahora en formato 'YYYY-MM-DDTHH:mm' (local). */
export function nowLocalInput(): string {
  return dateToLocalInput(new Date());
}

/** Hoy en formato 'YYYY-MM-DD' (local). */
export function localTodayInput(): string {
  return dateToLocalDate(new Date());
}

/** ISO UTC → 'YYYY-MM-DDTHH:mm' (local). '' si inválido/vacío. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateToLocalInput(d);
}

/** ISO UTC → 'YYYY-MM-DD' (local). '' si inválido/vacío. */
export function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateToLocalDate(d);
}

/**
 * Valor local del input → ISO UTC para el backend.
 * El string SIN zona se interpreta como hora LOCAL.
 * - 'YYYY-MM-DDTHH:mm' → JS lo parsea como local.
 * - 'YYYY-MM-DD' (solo fecha) → se añade 'T00:00' para que también sea local
 *   (si no, `new Date('YYYY-MM-DD')` se interpretaría como UTC).
 */
export function localInputToIso(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value}T00:00`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Parsea un valor local ('YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm') a Date LOCAL, o null. */
export function parseLocalValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ¿a y b son el mismo día local? */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Cabecera de semana empezando en lunes. */
export const WEEKDAYS_ES_MON = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Día de la semana con lunes=0 … domingo=6. */
export function mondayFirstWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}
