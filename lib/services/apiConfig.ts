import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "@/lib/auth/token-client";

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

// Crear instancia de axios
const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000, // 30 segundos
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

    // Manejo global de errores
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as unknown;

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
          console.error("Error 401 - Unauthorized:", data);
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
        console.error("Error 401 - Unauthorized:", data);
        return Promise.reject(error);
      }

      switch (status) {
        case 400:
          // Bad Request - Error en los datos enviados
          const message400 =
            data?.message ||
            "Solicitud incorrecta. Verifica los datos enviados.";
          interceptorHandlers.onNotification?.(message400, "error");
          console.error("Error 400 - Bad Request:", data);
          break;

        case 403:
          // Forbidden - Usuario no tiene permisos
          const message403 =
            data?.message || "No tienes permisos para realizar esta acción.";
          interceptorHandlers.onNotification?.(message403, "error");
          interceptorHandlers.onForbidden?.();
          console.error("Error 403 - Forbidden:", data);
          break;

        case 404:
          // Not Found
          const message404 =
            data?.message || "El recurso solicitado no fue encontrado.";
          interceptorHandlers.onNotification?.(message404, "warning");
          console.error("Error 404 - Not Found:", data);
          break;

        case 422:
          // Unprocessable Entity - Errores de validación
          const message422 =
            data?.message ||
            "Error de validación. Verifica los datos enviados.";
          interceptorHandlers.onNotification?.(message422, "error");
          console.error("Error 422 - Validation Error:", data);
          break;

        case 500:
          // Internal Server Error
          const message500 =
            data?.message ||
            "Error interno del servidor. Por favor, intenta más tarde.";
          interceptorHandlers.onNotification?.(message500, "error");
          console.error("Error 500 - Internal Server Error:", data);
          break;

        case 502:
          // Bad Gateway
          interceptorHandlers.onNotification?.(
            "Servicio no disponible temporalmente.",
            "error",
          );
          console.error("Error 502 - Bad Gateway:", data);
          break;

        case 503:
          // Service Unavailable
          interceptorHandlers.onNotification?.(
            "Servicio en mantenimiento. Intenta más tarde.",
            "error",
          );
          console.error("Error 503 - Service Unavailable:", data);
          break;

        default:
          // Otros errores HTTP
          const messageDefault =
            data?.message || `Error ${status}: ${error.message}`;
          interceptorHandlers.onNotification?.(messageDefault, "error");
          console.error(`Error ${status}:`, data);
      }
    } else if (error.request) {
      // La petición se realizó pero no se recibió respuesta
      interceptorHandlers.onNotification?.(
        "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
        "error",
      );
      console.error(
        "Error de red - Sin respuesta del servidor:",
        error.request,
      );
    } else {
      // Error al configurar la petición
      interceptorHandlers.onNotification?.(
        "Error al procesar la solicitud.",
        "error",
      );
      console.error("Error al configurar la petición:", error.message);
    }

    return Promise.reject(error);
  },
);

export default apiInstance;
