/**
 * normalize-error.ts — Normalizador centralizado de errores (Bento 2026)
 *
 * Convierte CUALQUIER fallo (AxiosError, timeout, red, offline, error JS)
 * en un AppError tipado con userMessage SEGURO en español.
 *
 * Reglas:
 * - NUNCA exponer stack, nombres de clase Java, rutas de archivo ni líneas.
 * - Si el backend envía un mensaje seguro (contrato limpio), se usa tal cual.
 * - Si el mensaje contiene patrones de fuga interna (.java LINE, [Exception]),
 *   se reemplaza con el mensaje del mapa de status.
 * - El campo `technical` se destina ÚNICAMENTE a console/logs, jamás al usuario.
 */

// ============================================================
// TIPO PRINCIPAL
// ============================================================

export interface AppError {
  /** HTTP status code (0 para errores sin respuesta del servidor). */
  status: number;
  /** Código semántico: "NOT_FOUND", "FORBIDDEN", "NETWORK", "TIMEOUT", etc. */
  code: string;
  /** Mensaje SEGURO en español, apto para mostrar al usuario como título de toast. */
  userMessage: string;
  /** Mensaje técnico crudo — usar SOLO en console.error / logs. */
  technical?: string;
  /** Correlation ID del header X-Correlation-Id (para soporte en 5xx). */
  correlationId?: string;
  /** Errores de campo en respuestas 400/422 con validación detallada. */
  fieldErrors?: Array<{ field: string; message: string }>;
  /** true cuando el error proviene de una pérdida de conectividad (sin request). */
  isNetwork: boolean;
  /** true cuando Axios abortó por timeout (ECONNABORTED). */
  isTimeout: boolean;
  /**
   * true cuando el interceptor global ya procesó este error y mostró un toast.
   * Los manejadores downstream pueden consultar este flag para evitar doble notificación.
   */
  _handled: boolean;
}

// ============================================================
// PATRONES DE DETECCIÓN DE FUGAS TÉCNICAS
// ============================================================

/** Detecta el patrón exacto generado por Utils.readException del backend:
 *  "… ON FileName.java LINE 123 [com.pkg.SomeException]"
 */
const JAVA_FILE_LINE = /\bon\s+\S+\.java\s+line\s+\d+/i;

/** Detecta corchetes con nombre de clase Java (Exception, Error, Handler…). */
const JAVA_EXCEPTION_CLASS = /\[\S*(?:Exception|Error|Handler|Filter|Servlet|Controller)\]/i;

/** Detecta paquetes Java completos (com.empresa.paquete.Clase). */
const JAVA_PACKAGE_PATH = /\bcom\.\w+(?:\.\w+){2,}/;

/**
 * Devuelve true si el mensaje es seguro para mostrarse al usuario:
 * - Es un string no vacío.
 * - No contiene patrones de fuga técnica Java.
 */
export function isSafeMessage(msg: unknown): msg is string {
  if (typeof msg !== "string" || !msg.trim()) return false;
  if (JAVA_FILE_LINE.test(msg)) return false;
  if (JAVA_EXCEPTION_CLASS.test(msg)) return false;
  if (JAVA_PACKAGE_PATH.test(msg)) return false;
  return true;
}

// ============================================================
// MAPA STATUS → MENSAJE USUARIO (corto, para título de toast)
// ============================================================

const STATUS_MESSAGES: Record<number, string> = {
  400: "Datos inválidos",
  401: "Sesión expirada",
  403: "Sin permisos",
  404: "Recurso no encontrado",
  409: "Conflicto de datos",
  422: "Datos no válidos",
  429: "Demasiados intentos",
  500: "Error del servidor",
  502: "Servicio no disponible",
  503: "Servicio en mantenimiento",
};

const STATUS_DESCRIPTIONS: Record<number, string> = {
  400: "Revisa la información e inténtalo de nuevo.",
  401: "Vuelve a iniciar sesión para continuar.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado puede haber sido eliminado.",
  409: "El registro ya existe o fue modificado. Recarga e inténtalo de nuevo.",
  422: "Revisa los campos marcados e inténtalo de nuevo.",
  429: "Espera unos segundos e inténtalo de nuevo.",
  500: "Inténtalo de nuevo; si persiste, contacta a soporte.",
  502: "El servidor no está respondiendo. Inténtalo en unos momentos.",
  503: "El servicio está en mantenimiento. Inténtalo más tarde.",
};

const DEFAULT_MESSAGE = "Ocurrió un error";
const NETWORK_MESSAGE = "Sin conexión con el servidor";
const TIMEOUT_MESSAGE = "Tiempo de espera agotado";
const OFFLINE_MESSAGE = "Sin conexión a internet";

// ============================================================
// MAPA CODE → STATUS CODE
// ============================================================

const CODE_FROM_STATUS: Record<number, string> = {
  400: "VALIDATION",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE",
  429: "RATE_LIMITED",
  500: "INTERNAL",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
};

// ============================================================
// HELPERS PÚBLICOS
// ============================================================

/**
 * Dado un mensaje crudo del backend y el status HTTP,
 * devuelve un string seguro para el usuario.
 *
 * Uso principal: `handleServiceError` y consumidores que reciben
 * solo el objeto de respuesta (no el AxiosError completo).
 */
export function safeUserMessage(rawMessage: unknown, status?: number): string {
  if (isSafeMessage(rawMessage)) return rawMessage;
  if (status !== undefined && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }
  return DEFAULT_MESSAGE;
}

/**
 * Devuelve la descripción sugerida para un status HTTP dado.
 * Útil para toasts que quieran mostrar más detalle bajo el título.
 */
export function statusDescription(status: number): string {
  return STATUS_DESCRIPTIONS[status] ?? "Inténtalo de nuevo.";
}

// ============================================================
// TYPE GUARD
// ============================================================

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    "_handled" in err &&
    "userMessage" in err &&
    "code" in err &&
    "isNetwork" in err
  );
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

/**
 * Normaliza CUALQUIER error en un AppError con mensaje seguro en español.
 *
 * Detecta automáticamente:
 * - AxiosError con respuesta del servidor (4xx / 5xx)
 * - Timeout de Axios (ECONNABORTED)
 * - Error de red (request enviado, sin respuesta)
 * - Error de JavaScript genérico
 *
 * @example
 * ```ts
 * import { normalizeError } from "@/lib/errors/normalize-error";
 *
 * try { await apiCall(); }
 * catch (err) {
 *   const appErr = normalizeError(err);
 *   console.error(appErr.technical); // solo en logs
 *   notify.error(appErr.userMessage);
 * }
 * ```
 */
export function normalizeError(err: unknown): AppError {
  // Evitar doble normalización si ya es un AppError
  if (isAppError(err)) return err;

  // Tipado débil para inspeccionar propiedades de AxiosError / Error
  const e = err as {
    response?: {
      status?: number;
      data?: unknown;
      headers?: Record<string, string>;
    };
    request?: unknown;
    code?: string;
    message?: string;
    isAxiosError?: boolean;
  };

  // ── A. Error con respuesta HTTP del servidor ──────────────────────────
  if (e.response) {
    const status = e.response.status ?? 0;
    const data = e.response.data as
      | {
          code?: string;
          message?: string;
          details?: string;
          errors?: unknown[];
        }
      | undefined;

    const rawMessage = data?.message ?? data?.details;
    const userMessage = safeUserMessage(rawMessage, status);
    const code = data?.code ?? CODE_FROM_STATUS[status] ?? `HTTP_${status}`;
    const correlationId = e.response.headers?.["x-correlation-id"];

    // Extraer errores de campo si el backend los envía en el array `errors`
    let fieldErrors: AppError["fieldErrors"];
    if (Array.isArray(data?.errors)) {
      fieldErrors = (data.errors as Array<{ field?: string; message?: string }>)
        .filter((fe) => fe.field)
        .map((fe) => ({
          field: fe.field ?? "",
          message: isSafeMessage(fe.message) ? fe.message : "Valor inválido",
        }));
    }

    return {
      status,
      code,
      userMessage,
      technical: e.message,
      correlationId,
      fieldErrors,
      isNetwork: false,
      isTimeout: false,
      _handled: false,
    };
  }

  // ── B. Timeout de Axios ───────────────────────────────────────────────
  if (e.code === "ECONNABORTED") {
    return {
      status: 0,
      code: "TIMEOUT",
      userMessage: TIMEOUT_MESSAGE,
      technical: e.message,
      isNetwork: false,
      isTimeout: true,
      _handled: false,
    };
  }

  // ── C. Sin respuesta del servidor (error de red / CORS / offline) ─────
  if (e.request !== undefined) {
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    return {
      status: 0,
      code: "NETWORK",
      userMessage: offline ? OFFLINE_MESSAGE : NETWORK_MESSAGE,
      technical: e.message,
      isNetwork: true,
      isTimeout: false,
      _handled: false,
    };
  }

  // ── D. Error JS genérico (config, parse, etc.) ────────────────────────
  const jsErr = err instanceof Error ? err : null;
  return {
    status: 0,
    code: "CLIENT_ERROR",
    userMessage: DEFAULT_MESSAGE,
    technical: jsErr?.message ?? String(err),
    isNetwork: false,
    isTimeout: false,
    _handled: false,
  };
}

// ============================================================
// ¿REINTENTABLE?
// ============================================================

/**
 * ¿Tiene sentido ofrecer "reintentar" esta MISMA petición sin cambiar nada?
 *
 * - **Sí (transitorio)**: red caída, timeout, `429` (cupo: el propio backend
 *   dice en cuántos segundos volver) y `5xx` (el servidor falló, no la
 *   petición).
 * - **No (permanente)**: el resto de `4xx`. El backend rechaza el CONTENIDO o
 *   el estado de la petición (contrato inválido, recurso ya cerrado, sin
 *   permisos); repetirla idéntica volverá a fallar. Ofrecer un botón de
 *   reintento ahí es un callejón sin salida: hay que informar y retirar la
 *   acción, no invitar a insistir.
 *
 * Un error de JavaScript sin respuesta HTTP (`status 0`) cuenta como
 * transitorio a propósito: preferimos conservar el trabajo del usuario y
 * dejarle reintentar antes que descartarlo por un fallo que no entendemos.
 */
export function isRetryableError(err: unknown): boolean {
  const { status } = normalizeError(err);
  if (status === 429) return true;
  if (status >= 500) return true;
  return status === 0;
}
