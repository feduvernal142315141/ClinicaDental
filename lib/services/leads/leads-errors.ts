/**
 * Errores del módulo "Adquisición de pacientes".
 *
 * Formato del backend: `{ code, message, status, timestamp, path, errorCode }`. El `message`
 * viene en español y es seguro mostrarlo; el comportamiento se decide SIEMPRE por `errorCode`,
 * nunca por el texto. Un 403 sin `errorCode` es falta de permiso (`code: "FORBIDDEN"`).
 */

export const LEAD_ERROR_CODES = [
  "MODULE_NOT_ENABLED",
  "LEAD_NOT_FOUND",
  "LEAD_INVALID",
  "LEAD_VERSION_CONFLICT",
  "LEAD_DUPLICATE_OPEN",
  "LEAD_PATIENT_MATCH_UNRESOLVED",
  "LEAD_ALREADY_CONVERTED",
  "LEAD_CLOSED",
  "LEAD_FOLLOW_UP_NOT_FOUND",
  "LEAD_FOLLOW_UP_CLOSED",
  "LEAD_CONVERSATION_NOT_FOUND",
  "LEAD_CONVERSATION_HAS_PATIENT",
  "BOOKING_SETTINGS_INVALID",
  "BOOKING_SETTINGS_VERSION_CONFLICT",
] as const;
export type LeadErrorCode = (typeof LEAD_ERROR_CODES)[number];

export const LEAD_MODULE_DISABLED_MESSAGE = "Tu clínica no tiene habilitado este módulo";
export const LEAD_FORBIDDEN_FALLBACK_MESSAGE = "No tienes permiso para esta acción";

export type LeadErrorKind =
  | "module-disabled"
  | "forbidden"
  | "unauthorized"
  | "not-found"
  | "conflict"
  | "bad-request"
  | "network"
  | "server";

export class LeadApiError extends Error {
  readonly kind: LeadErrorKind;
  readonly status?: number;
  /** `code` genérico del backend (FORBIDDEN, BAD_REQUEST…). */
  readonly code?: string;
  /** Código de negocio: es lo único con lo que la UI decide qué hacer. */
  readonly errorCode?: LeadErrorCode | string;

  constructor(kind: LeadErrorKind, message: string, status?: number, code?: string, errorCode?: string) {
    super(message);
    this.name = "LeadApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.errorCode = errorCode;
  }
}

function readString(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const STATUS_FALLBACK: Record<number, string> = {
  400: "La solicitud no es válida.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  404: "El prospecto no existe.",
  409: "La operación entra en conflicto con el estado actual. Recarga y vuelve a intentar.",
};

/** Traduce una respuesta HTTP de error a un `LeadApiError` tipado. */
export function toLeadError(status: number | undefined, body: unknown): LeadApiError {
  const message = readString(body, "message");
  const code = readString(body, "code");
  const errorCode = readString(body, "errorCode");

  if (status === undefined) {
    return new LeadApiError("network", "No se pudo conectar con el servidor. Revisa tu conexión y reintenta.");
  }
  if (status === 403) {
    if (errorCode === "MODULE_NOT_ENABLED") {
      return new LeadApiError("module-disabled", LEAD_MODULE_DISABLED_MESSAGE, status, code, errorCode);
    }
    return new LeadApiError("forbidden", message ?? LEAD_FORBIDDEN_FALLBACK_MESSAGE, status, code, errorCode);
  }
  if (status === 401) return new LeadApiError("unauthorized", message ?? STATUS_FALLBACK[401], status, code, errorCode);
  if (status === 404) return new LeadApiError("not-found", message ?? STATUS_FALLBACK[404], status, code, errorCode);
  if (status === 409) return new LeadApiError("conflict", message ?? STATUS_FALLBACK[409], status, code, errorCode);
  if (status >= 400 && status < 500) {
    return new LeadApiError("bad-request", message ?? STATUS_FALLBACK[400], status, code, errorCode);
  }
  return new LeadApiError(
    "server",
    message ?? "Ocurrió un error en el servidor. Intenta de nuevo en unos minutos.",
    status,
    code,
    errorCode,
  );
}

export function isLeadApiError(error: unknown): error is LeadApiError {
  return error instanceof LeadApiError;
}

/** `true` si el error trae exactamente ese código de negocio. */
export function hasLeadErrorCode(error: unknown, errorCode: LeadErrorCode): boolean {
  return isLeadApiError(error) && error.errorCode === errorCode;
}

export function isLeadModuleDisabledError(error: unknown): boolean {
  return isLeadApiError(error) && error.kind === "module-disabled";
}

/** Mensaje para el usuario: el del backend tal cual, o uno genérico. */
export function leadErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado."): string {
  if (isLeadApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ─── Notificación de "módulo apagado" ───────────────────────────────

type Listener = () => void;
const moduleDisabledListeners = new Set<Listener>();

/** Suscribe a los 403 `MODULE_NOT_ENABLED` (los emite el cliente HTTP). Devuelve el unsubscribe. */
export function onLeadModuleDisabled(listener: Listener): () => void {
  moduleDisabledListeners.add(listener);
  return () => {
    moduleDisabledListeners.delete(listener);
  };
}

export function emitLeadModuleDisabled(): void {
  moduleDisabledListeners.forEach((listener) => listener());
}
