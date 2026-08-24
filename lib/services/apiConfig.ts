import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "@/lib/auth/token-client";
import { normalizeError } from "@/lib/errors/normalize-error";

// Tipos para los handlers que se pueden inyectar desde Redux u otros estados
type InterceptorHandlers = {
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
  onNotification?: (
    message: string,
    type: "success" | "error" | "warning" | "info",
  ) => void;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onActivity?: () => void; // Se llama en cada petición HTTP para resetear inactividad
};

// Variable para almacenar los handlers (se pueden inyectar posteriormente desde Redux)
let interceptorHandlers: InterceptorHandlers = {};

// ============================================
// ESTADO DE SESIÓN (manejo idempotente de 401)
// ============================================

// Promesa de refresh compartida: evita que N peticiones 401 concurrentes
// disparen N llamadas a /api/auth/refresh. Todas esperan el mismo intento.
let refreshPromise: Promise<boolean> | null = null;

// Bandera para que la expiración de sesión se notifique/redirija UNA sola vez,
// aunque varias peticiones fallen con 401 al mismo tiempo.
let sessionExpiryHandled = false;

/**
 * Indica si una expiración de sesión global ya está siendo manejada
 * (modal + redirección). Las features pueden consultarlo para no mostrar
 * sus propios toasts/errores redundantes ante un 401.
 */
export const isSessionExpired = (): boolean => sessionExpiryHandled;

/**
 * Intenta refrescar el access token una sola vez de forma compartida.
 * Si ya hay un refresh en curso, devuelve la misma promesa.
 */
const tryRefreshOnce = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

/**
 * Función para configurar los handlers de los interceptores
 * Esto permite inyectar dispatch de Redux u otras funciones de estado global
 */
export const setInterceptorHandlers = (
  handlers: Partial<InterceptorHandlers>,
) => {
  interceptorHandlers = { ...interceptorHandlers, ...handlers };
};

// ============================================
// TIMEOUTS
// ============================================

/**
 * Timeout de una pantalla normal. Una consulta a la API responde en cientos de
 * milisegundos; 30 s ya son un fallo. No subir este valor: es lo que impide que
 * una pantalla cualquiera se quede colgada medio minuto.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Timeout de los endpoints que encadenan proveedores de IA (`/speech/transcribe`
 * y `/speech/transcribe/odontogram`).
 *
 * Con los 30 s por defecto el doctor veía «timeout of 30000ms exceeded» mientras
 * el backend seguía trabajando y gastando llamadas de pago: el cliente se rendía
 * ANTES que el servidor, así que la respuesta —incluso la buena— no llegaba a la
 * pantalla nunca. La regla es la contraria: el cliente corta después.
 *
 * El presupuesto del servidor para un dictado (ver `gemini.http.read-timeout-ms`
 * en backend-clinic/src/main/resources/application.yml) es transcripción (~10 s
 * de holgura sobre el ~1 s medido) + hasta tres llamadas a Gemini de 35 s =
 * 115 s. 120 s lo cubren entero con margen para la subida del audio.
 *
 * OJO: 120 s es el TOPE, no lo esperado. Un dictado sano tarda segundos y el
 * backend ya avisa en su log al pasar de 12 s (SLO). Si alguna vez se baja el
 * `read-timeout-ms` del backend, bájese también esto.
 */
const PROVIDER_CHAIN_TIMEOUT_MS = 120_000;

/**
 * ¿La petición encadena proveedores de IA en el backend?
 *
 * Solo los POST de dictado. El GET de disponibilidad
 * (`/speech/transcribe/odontogram/availability`) es una consulta local y se
 * queda con el timeout normal, por eso se exige el método.
 */
const usesProviderChain = (config: InternalAxiosRequestConfig): boolean =>
  (config.method ?? "get").toLowerCase() === "post" &&
  String(config.url ?? "").includes("/speech/transcribe");

// Crear instancia de axios
const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// INTERCEPTOR DE REQUEST
// ============================================
apiInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Activar indicador de carga
    interceptorHandlers.onLoadingStart?.();

    // Registrar actividad del usuario (resetea timer de inactividad)
    interceptorHandlers.onActivity?.();

    // Los dictados esperan a varios proveedores encadenados: se les amplía el
    // timeout AQUÍ y solo a ellos, para no alargar el de ninguna otra pantalla.
    if (usesProviderChain(config)) {
      config.timeout = PROVIDER_CHAIN_TIMEOUT_MS;
    }

    // Obtener el access token desde cookie (flujo OTP/JWT backend)
    const accessToken = getAccessToken();
    if (accessToken) {
      const headers: unknown = config.headers;
      if (headers && typeof headers.set === "function") {
        headers.set("Authorization", `Bearer ${accessToken}`);
      } else {
        config.headers = {
          ...(headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        } as unknown;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    // Desactivar indicador de carga en caso de error
    interceptorHandlers.onLoadingEnd?.();
    return Promise.reject(error);
  },
);

// ============================================
// INTERCEPTOR DE RESPONSE
// ============================================
apiInstance.interceptors.response.use(
  (response) => {
    // Desactivar indicador de carga
    interceptorHandlers.onLoadingEnd?.();

    return response;
  },
  async (error: AxiosError) => {
    // Desactivar indicador de carga
    interceptorHandlers.onLoadingEnd?.();

    // Normalizar a AppError (mensaje seguro, sin fugas técnicas de Java).
    const appError = normalizeError(error);

    if (error.response) {
      const status = error.response.status;

      // ============================================
      // MANEJO DE 401 (idempotente, refresh compartido)
      // ============================================
      if (status === 401) {
        const originalRequest = error.config as unknown;
        const url = String(originalRequest?.url ?? "");

        // Endpoints de auth: un 401 significa credenciales/código inválidos
        // o que el propio refresh falló. Se propaga en silencio al servicio
        // que lo invocó (el formulario o el flujo de expiración lo maneja).
        const isAuthEndpoint =
          url.includes("/auth/login") ||
          url.includes("/auth/validate-otp") ||
          url.includes("/auth/refresh-token") ||
          url.includes("/api/auth/");

        if (isAuthEndpoint) {
          console.error("[401] Auth endpoint — propagado al servicio:", appError.technical);
          return Promise.reject(error);
        }

        // Endpoint protegido: intentar UN refresh compartido entre peticiones.
        if (!originalRequest?._retry) {
          originalRequest._retry = true;
          const refreshed = await tryRefreshOnce();
          if (refreshed) {
            // Sesión recuperada: el request interceptor tomará el nuevo token.
            sessionExpiryHandled = false;
            return apiInstance(originalRequest);
          }
        }

        // Refresh falló o ya se reintentó: la sesión expiró de verdad.
        // Notificar y redirigir UNA sola vez aunque caigan varios 401 a la vez.
        if (!sessionExpiryHandled) {
          sessionExpiryHandled = true;
          interceptorHandlers.onUnauthorized?.();
        }
        console.error("[401] Sesión expirada:", appError.technical);
        // El usuario YA fue notificado (modal de sesión expirada + redirect):
        // marcar el error para que GlobalErrorListeners no duplique el aviso.
        (error as { _interceptorHandled?: boolean })._interceptorHandled = true;
        return Promise.reject(error);
      }

      // ============================================
      // RESTO DE CÓDIGOS HTTP (403 / 404 / 4xx / 5xx)
      // El toast lo emite la capa que INVOCA (hook/servicio) con un mensaje
      // CONTEXTUAL; el interceptor solo normaliza, ejecuta side-effects globales
      // y registra — así NO se duplica el toast. `GlobalErrorListeners` es la red
      // de seguridad para errores que nadie atrapa.
      // ============================================
      if (status === 403) {
        interceptorHandlers.onForbidden?.();
        // onForbidden ya mostró "Acceso Denegado" al usuario: marcar el error
        // para que GlobalErrorListeners no duplique el aviso.
        (error as { _interceptorHandled?: boolean })._interceptorHandled = true;
      }

      console.error(
        `[HTTP ${status}] ${appError.code}:`,
        { technical: appError.technical, correlationId: appError.correlationId },
      );

    } else if (appError.isTimeout) {
      console.error("[TIMEOUT]:", appError.technical);

    } else if (appError.isNetwork) {
      console.error("[NETWORK]:", appError.technical);

    } else {
      console.error("[CLIENT_ERROR]:", appError.technical);
    }

    // OJO: NO marcar `_interceptorHandled` aquí. Para 400/404/409/422/5xx,
    // timeout y network el interceptor NO muestra ningún toast (solo registra
    // en consola); el flag se estampa ÚNICAMENTE en las ramas 401-sesión-expirada
    // y 403, donde el usuario sí fue notificado. Así GlobalErrorListeners
    // conserva su toast genérico de respaldo para promesas sin catch.

    // Propagar el AxiosError original (no el AppError) para mantener
    // compatibilidad con baseService.ts que hace err.response.
    return Promise.reject(error);
  },
);

export default apiInstance;
