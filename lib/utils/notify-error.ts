import { notify } from "@/lib/utils/notify";
import {
  normalizeError,
  isSafeMessage,
} from "@/lib/errors/normalize-error";

/**
 * notify-error.ts — Helper ÚNICO para toasts de error de API (estándar 2026).
 *
 * Regla de copy (Sileo tiene título + descripción):
 * - `title`  = QUÉ acción falló, corto y contextual ("No se pudo crear el paciente").
 * - descripción = el MENSAJE REAL del backend ("Ya existe un paciente con el
 *   correo 'x@y.com' en esta clínica."). Si el backend no envió un mensaje
 *   seguro, cae al `fallbackDescription` genérico.
 *
 * Así el usuario ve el título contextual + la causa concreta, en vez de un
 * genérico "Error inesperado". Úsalo en TODO catch de mutación de hooks/servicios
 * en lugar de armar el `notify.error` a mano.
 *
 * @example
 * try { await createPatient(data); }
 * catch (error) {
 *   notifyApiError("No se pudo crear el paciente", error);
 *   throw error; // el caller decide si mantiene el form abierto
 * }
 */
export function notifyApiError(
  title: string,
  error: unknown,
  fallbackDescription = "Inténtalo de nuevo. Si el problema continúa, contacta a soporte.",
): void {
  notify.error(title, {
    description: extractApiErrorMessage(error) ?? fallbackDescription,
  });
}

/** Genérico que Axios pone en `error.message` — nunca debe mostrarse al usuario. */
const AXIOS_GENERIC = /request failed with status code/i;

/**
 * Extrae el mensaje SEGURO del backend de cualquier error de servicio, o
 * `undefined` si no hay uno apto para el usuario.
 *
 * - `handleServiceError` (lib/utils/error.utils) lanza un `Error` cuyo `.message`
 *   ya viene saneado por `safeUserMessage` → se usa tal cual.
 * - Si llega un `AxiosError` crudo (sin pasar por `handleServiceError`), se
 *   normaliza y se usa `userMessage` (que extrae `response.data.message`).
 */
export function extractApiErrorMessage(error: unknown): string | undefined {
  if (
    error instanceof Error &&
    isSafeMessage(error.message) &&
    !AXIOS_GENERIC.test(error.message)
  ) {
    return error.message;
  }

  const appError = normalizeError(error);
  if (appError.status > 0 && isSafeMessage(appError.userMessage)) {
    return appError.userMessage;
  }

  return undefined;
}
