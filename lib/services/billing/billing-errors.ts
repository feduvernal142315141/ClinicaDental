/**
 * Errores del módulo de Finanzas.
 *
 * Formato del backend: `{ code, message, status, timestamp, path }`. El `message` ya viene en
 * español y se muestra tal cual. El 403 de "módulo apagado" se distingue del 403 de permiso
 * únicamente por su mensaje exacto (el `code` es FORBIDDEN en ambos).
 */

export const FINANCE_MODULE_DISABLED_MESSAGE =
  "El módulo de Finanzas no está habilitado para esta clínica.";

export const FORBIDDEN_FALLBACK_MESSAGE = "No tienes permiso para esta acción";

export type BillingErrorKind =
  | "module-disabled"
  | "forbidden"
  | "unauthorized"
  | "not-found"
  | "conflict"
  | "bad-request"
  | "validation"
  | "network"
  | "server";

export class BillingApiError extends Error {
  readonly kind: BillingErrorKind;
  readonly status?: number;
  readonly code?: string;

  constructor(kind: BillingErrorKind, message: string, status?: number, code?: string) {
    super(message);
    this.name = "BillingApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

function readMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const { message, details } = body as ErrorBody;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (typeof details === "string" && details.trim()) return details.trim();
  return undefined;
}

function readCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const { code } = body as ErrorBody;
  return typeof code === "string" ? code : undefined;
}

const STATUS_FALLBACK: Record<number, string> = {
  400: "La solicitud no es válida.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  404: "No encontramos el recurso solicitado.",
  409: "La operación entra en conflicto con el estado actual. Recarga y vuelve a intentar.",
  422: "Revisa los datos ingresados.",
};

/** Traduce una respuesta HTTP de error a un `BillingApiError` tipado. */
export function toBillingError(status: number | undefined, body: unknown): BillingApiError {
  const message = readMessage(body);
  const code = readCode(body);

  if (status === undefined) {
    return new BillingApiError(
      "network",
      "No se pudo conectar con el servidor. Revisa tu conexión y reintenta.",
    );
  }
  if (status === 403) {
    if (message === FINANCE_MODULE_DISABLED_MESSAGE) {
      return new BillingApiError("module-disabled", FINANCE_MODULE_DISABLED_MESSAGE, status, code);
    }
    return new BillingApiError("forbidden", message ?? FORBIDDEN_FALLBACK_MESSAGE, status, code);
  }
  if (status === 401) {
    return new BillingApiError("unauthorized", message ?? STATUS_FALLBACK[401], status, code);
  }
  if (status === 404) {
    return new BillingApiError("not-found", message ?? STATUS_FALLBACK[404], status, code);
  }
  if (status === 409) {
    return new BillingApiError("conflict", message ?? STATUS_FALLBACK[409], status, code);
  }
  if (status === 422 || code === "VALIDATION") {
    return new BillingApiError("validation", message ?? STATUS_FALLBACK[422], status, code);
  }
  if (status >= 400 && status < 500) {
    return new BillingApiError("bad-request", message ?? STATUS_FALLBACK[400], status, code);
  }
  return new BillingApiError(
    "server",
    message ?? "Ocurrió un error en el servidor. Intenta de nuevo en unos minutos.",
    status,
    code,
  );
}

export function isBillingApiError(error: unknown): error is BillingApiError {
  return error instanceof BillingApiError;
}

export function isModuleDisabledError(error: unknown): boolean {
  return isBillingApiError(error) && error.kind === "module-disabled";
}

export function isNotFoundError(error: unknown): boolean {
  return isBillingApiError(error) && error.kind === "not-found";
}

export function isConflictError(error: unknown): boolean {
  return isBillingApiError(error) && error.kind === "conflict";
}

/** Mensaje para el usuario: el del backend tal cual, o uno genérico. */
export function billingErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado."): string {
  if (isBillingApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ─── Notificación de "módulo apagado" ───────────────────────────────

type Listener = () => void;
const moduleDisabledListeners = new Set<Listener>();

/** Suscribe a los 403 de módulo apagado (los emite el cliente HTTP). Devuelve el unsubscribe. */
export function onFinanceModuleDisabled(listener: Listener): () => void {
  moduleDisabledListeners.add(listener);
  return () => {
    moduleDisabledListeners.delete(listener);
  };
}

export function emitFinanceModuleDisabled(): void {
  moduleDisabledListeners.forEach((listener) => listener());
}
