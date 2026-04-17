import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "@/lib/auth/token-client";

// Tipos para los handlers que se pueden inyectar desde Redux u otros estados
type InterceptorHandlers = {
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
  onNotification?: (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => void;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onActivity?: () => void; // Se llama en cada petición HTTP para resetear inactividad
};

// Variable para almacenar los handlers (se pueden inyectar posteriormente desde Redux)
let interceptorHandlers: InterceptorHandlers = {};

/**
 * Función para configurar los handlers de los interceptores
 * Esto permite inyectar dispatch de Redux u otras funciones de estado global
 */
export const setInterceptorHandlers = (
  handlers: Partial<InterceptorHandlers>
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
  }
);

// ============================================
// INTERCEPTOR DE RESPONSE
// ============================================
apiInstance.interceptors.response.use(
  (response) => {
    // Desactivar indicador de carga
    interceptorHandlers.onLoadingEnd?.();

    // Manejar respuestas exitosas con notificaciones
    const status = response.status;
    const method = response.config.method?.toUpperCase();

    // Mostrar notificación de éxito para operaciones CREATE (POST con 201)
    if (status === 201 && method === "POST") {
      const url = response.config.url || "";
      let message = "Recurso creado exitosamente";

      // Mensajes personalizados según el endpoint
      if (url.includes("/doctor")) {
        message = "Doctor creado correctamente";
      } else if (url.includes("/patient")) {
        message = "Paciente creado correctamente";
      } else if (url.includes("/appointment")) {
        message = "Cita creada correctamente";
      }

      interceptorHandlers.onNotification?.(message, "success");
    }

    // Mostrar notificación de éxito para operaciones UPDATE (PUT con 200)
    if (status === 200 && method === "PUT") {
      const url = response.config.url || "";
      let message = "Recurso actualizado exitosamente";

      // Mensajes personalizados según el endpoint
      if (url.includes("/doctor")) {
        message = "Doctor actualizado correctamente";
      } else if (url.includes("/patient")) {
        message = "Paciente actualizado correctamente";
      } else if (url.includes("/appointment")) {
        message = "Cita actualizada correctamente";
      }

      interceptorHandlers.onNotification?.(message, "success");
    }

    return response;
  },
  async (error: AxiosError) => {
    // Desactivar indicador de carga
    interceptorHandlers.onLoadingEnd?.();

    // Manejo global de errores
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as unknown;

      // Intento de refresh una sola vez (si expira access token)
      if (status === 401) {
        const originalRequest = error.config as unknown;
        const isRetry = originalRequest?._retry;
        const url = String(originalRequest?.url ?? "");

        const shouldTryRefresh =
          !isRetry &&
          !url.includes("/auth/login") &&
          !url.includes("/auth/validate-otp") &&
          !url.includes("/auth/refresh-token") &&
          !url.includes("/api/auth/refresh");

        if (shouldTryRefresh) {
          try {
            originalRequest._retry = true;
            const refreshRes = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });

            if (refreshRes.ok) {
              // Reintentar request original: el request interceptor tomará el nuevo token de cookie
              return apiInstance(originalRequest);
            }
          } catch {
            // Si falla, continuar flujo normal 401
          }
        }
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

        case 401:
          // Unauthorized - Usuario no autenticado
          const message401 =
            data?.message ||
            "Sesión expirada. Por favor, inicia sesión nuevamente.";
          interceptorHandlers.onNotification?.(message401, "warning");
          interceptorHandlers.onUnauthorized?.();
          console.error("Error 401 - Unauthorized:", data);
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
            "error"
          );
          console.error("Error 502 - Bad Gateway:", data);
          break;

        case 503:
          // Service Unavailable
          interceptorHandlers.onNotification?.(
            "Servicio en mantenimiento. Intenta más tarde.",
            "error"
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
        "error"
      );
      console.error(
        "Error de red - Sin respuesta del servidor:",
        error.request
      );
    } else {
      // Error al configurar la petición
      interceptorHandlers.onNotification?.(
        "Error al procesar la solicitud.",
        "error"
      );
      console.error("Error al configurar la petición:", error.message);
    }

    return Promise.reject(error);
  }
);

export default apiInstance;
