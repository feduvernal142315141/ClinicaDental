import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { extractApiErrorMessage } from "@/lib/utils/notify-error";
import { normalizeText } from "@/lib/utils/text";

/**
 * server-errors.ts — Marca en el formulario los campos culpables de un error
 * de negocio del backend (estándar 2026, complemento de `notifyApiError`).
 *
 * Problema: el backend devuelve errores de negocio como UN mensaje combinado
 * sin campos estructurados, p.ej.:
 *   "El usuario con número de identificación 'LIC-005' o correo electrónico
 *    'x@y.com' o nombre de usuario 'Fulano' ya existe."
 * El toast muestra la causa, pero el usuario también debe ver QUÉ campos
 * corregir (WCAG 2.2 — 3.3.1 Identificación de errores).
 *
 * Estrategia: como el mensaje cita los VALORES enviados, se comprueba qué
 * valores del formulario aparecen en él (comparación normalizada, sin
 * acentos/mayúsculas) y esos campos se marcan con `setError(type: "server")`.
 * El error inline se limpia solo cuando el usuario edita el campo (la
 * revalidación de zod en onBlur/onChange lo reemplaza).
 *
 * Úsalo en el catch del submit, ANTES del toast:
 * @example
 * catch (error) {
 *   applyServerErrorToFields(error, form.setError, [
 *     { field: "licenceNumber", value: values.licenceNumber, message: "Ya existe un doctor con este número de licencia." },
 *     { field: "email", value: values.email, message: "Ya existe un doctor con este correo electrónico." },
 *   ]);
 *   notifyApiError("No se pudo crear el doctor", error);
 * }
 */
export interface ServerFieldCandidate<T extends FieldValues> {
  /** Campo RHF a marcar si su valor aparece citado en el mensaje del backend. */
  field: Path<T>;
  /** Valor que se envió al backend para ese campo. */
  value: string | null | undefined;
  /** Mensaje inline en español, específico y accionable, para ese campo. */
  message: string;
}

/**
 * Marca los campos cuyo valor aparece en el mensaje de error del backend.
 * Devuelve `true` si al menos un campo quedó marcado (por si el caller quiere
 * omitir el toast o cambiar su copy). Enfoca el primer campo marcado.
 */
export function applyServerErrorToFields<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  candidates: Array<ServerFieldCandidate<T>>,
): boolean {
  const raw = extractApiErrorMessage(error);
  if (!raw) return false;

  const haystack = normalizeText(raw);
  let focused = false;
  let matched = false;

  for (const { field, value, message } of candidates) {
    const v = value?.trim();
    // Valores muy cortos (1-2 chars) matchearían por casualidad casi cualquier
    // mensaje; se omiten para no marcar campos inocentes.
    if (!v || v.length < 3) continue;
    if (!haystack.includes(normalizeText(v))) continue;

    matched = true;
    setError(
      field,
      { type: "server", message },
      { shouldFocus: !focused },
    );
    focused = true;
  }

  return matched;
}
