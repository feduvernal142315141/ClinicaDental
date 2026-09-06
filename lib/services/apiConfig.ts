import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "@/lib/auth/token-client";
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

let interceptorHandlers: InterceptorHandlers = {};

let refreshPromise: Promise<boolean> | null = null;

let sessionExpiryHandled = false;

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

const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
  },
});

apiInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    interceptorHandlers.onLoadingStart?.();
    interceptorHandlers.onActivity?.();
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
    interceptorHandlers.onLoadingEnd?.();
    return Promise.reject(error);
  },
);

apiInstance.interceptors.response.use(
  (response) => {
    interceptorHandlers.onLoadingEnd?.();
    return response;
  },
  async (error: AxiosError) => {
    interceptorHandlers.onLoadingEnd?.();
    const appError = normalizeError(error);
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        const originalRequest = error.config as unknown;
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
        if (!originalRequest?._retry) {
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
      if (status === 403) {
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
