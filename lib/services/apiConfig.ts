import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "@/lib/auth/token-client";
import { getEffectiveClinicLanguageFromToken } from "@/lib/auth/language-preference";
import { normalizeError } from "@/lib/errors/normalize-error";

type InterceptorHandlers = {
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
  onNotification?: (
    message: string,
    type: "success" | "error" | "warning" | "info",
  ) => void;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onActivity?: () => void;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let interceptorHandlers: InterceptorHandlers = {};

let refreshPromise: Promise<boolean> | null = null;

let sessionExpiryHandled = false;

// Track silent requests — these skip the global loading bar.
// WeakSet keyed on config object survives through response/error interceptors.
const silentRequests = new WeakSet<object>();

export const isSessionExpired = (): boolean => sessionExpiryHandled;
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

function setRequestHeader(
  config: InternalAxiosRequestConfig,
  name: string,
  value: string,
) {
  config.headers = AxiosHeaders.from(config.headers);
  config.headers.set(name, value);
}

// Crear instancia de axios
const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

apiInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Silent requests (polling/SSE refresh) skip the global loading indicator.
    const isSilent = config.headers?.["X-Silent"] === "true";
    if (isSilent) {
      config.headers.delete("X-Silent"); // Don't send to server
      silentRequests.add(config);        // Track for response interceptor
    } else {
      interceptorHandlers.onLoadingStart?.();
    }
    interceptorHandlers.onActivity?.();

    // Los dictados esperan a varios proveedores encadenados: se les amplía el
    // timeout AQUÍ y solo a ellos, para no alargar el de ninguna otra pantalla.
    if (usesProviderChain(config)) {
      config.timeout = PROVIDER_CHAIN_TIMEOUT_MS;
    }

    // Obtener el access token desde cookie (flujo OTP/JWT backend)
    const accessToken = getAccessToken();
    const language = getEffectiveClinicLanguageFromToken();
    setRequestHeader(config, "Accept-Language", language);

    if (accessToken) {
      setRequestHeader(config, "Authorization", `Bearer ${accessToken}`);
    }
    return config;
  },
  (error: AxiosError) => {
    if (error.config && !silentRequests.has(error.config)) {
      interceptorHandlers.onLoadingEnd?.();
    }
    return Promise.reject(error);
  },
);

apiInstance.interceptors.response.use(
  (response) => {
    if (!silentRequests.has(response.config)) {
      interceptorHandlers.onLoadingEnd?.();
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.config && !silentRequests.has(error.config)) {
      interceptorHandlers.onLoadingEnd?.();
    }
    const appError = normalizeError(error);
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        const originalRequest = error.config as
          | RetriableRequestConfig
          | undefined;
        const url = String(originalRequest?.url ?? "");

        const isAuthEndpoint =
          url.includes("/auth/login") ||
          url.includes("/auth/validate-otp") ||
          url.includes("/auth/refresh-token") ||
          url.includes("/api/auth/");
        if (isAuthEndpoint) {
          console.error("[401] Auth endpoint — propagado al servicio:", appError.technical);
          return Promise.reject(error);
        }
        if (originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshed = await tryRefreshOnce();
          if (refreshed) {
            sessionExpiryHandled = false;
            return apiInstance(originalRequest);
          }
        }
        if (!sessionExpiryHandled) {
          sessionExpiryHandled = true;
          interceptorHandlers.onUnauthorized?.();
        }
        console.error("[401] Sesión expirada:", appError.technical);
        (error as { _interceptorHandled?: boolean })._interceptorHandled = true;
        return Promise.reject(error);
      }
      // `skipForbiddenHandler`: el servicio decide qué mostrar (Finanzas distingue el 403
      // de "módulo apagado" del 403 de permiso y no debe disparar la alerta global).
      const skipForbiddenHandler = (
        error.config as { skipForbiddenHandler?: boolean } | undefined
      )?.skipForbiddenHandler;
      if (status === 403 && !skipForbiddenHandler) {
        interceptorHandlers.onForbidden?.();

        (error as { _interceptorHandled?: boolean })._interceptorHandled = true;
      }
      const expected = (
        error.config as { expectedStatuses?: number[] } | undefined
      )?.expectedStatuses;
      if (!expected?.includes(status)) {
        console.error(
          `[HTTP ${status}] ${appError.code}:`,
          { technical: appError.technical, correlationId: appError.correlationId },
        );
      }
    } else if (appError.isTimeout) {
      console.error("[TIMEOUT]:", appError.technical);
    } else if (appError.isNetwork) {
      console.error("[NETWORK]:", appError.technical);
    } else {
      console.error("[CLIENT_ERROR]:", appError.technical);
    }

    return Promise.reject(error);
  },
);
export default apiInstance;
