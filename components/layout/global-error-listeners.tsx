"use client";

/**
 * GlobalErrorListeners — captura global de errores no manejados.
 *
 * Registra, UNA SOLA VEZ al montar, los listeners:
 * - `unhandledrejection`: promesas rechazadas sin .catch().
 * - `error`: errores de JavaScript síncrono (window.onerror).
 * - `offline` / `online`: cambios de conectividad.
 *
 * Solo muestra toast de "conexión" o "error inesperado". Los errores que ya
 * fueron manejados por el interceptor de Axios (flag `_interceptorHandled`)
 * se ignoran para evitar dobles notificaciones.
 *
 * NO captura errores de render (esos los manejan error.tsx y global-error.tsx).
 */

import { useEffect } from "react";
import { notify } from "@/lib/utils/notify";

export function GlobalErrorListeners() {
  useEffect(() => {
    // ── unhandledrejection ──────────────────────────────────────────────────
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { _interceptorHandled?: boolean } | undefined;

      // Si el interceptor de Axios ya mostró toast, solo loguear.
      if (reason?._interceptorHandled === true) {
        console.warn(
          "[GlobalErrorListeners] Promesa rechazada ya manejada por el interceptor.",
          reason,
        );
        return;
      }

      // Promesa rechazada verdaderamente no manejada.
      console.error("[GlobalErrorListeners] unhandledrejection:", event.reason);
      notify.error("Error inesperado", {
        description:
          "Ocurrió un problema en segundo plano. Recarga la página si la aplicación no responde.",
      });
    };

    // ── error (JS síncrono) ─────────────────────────────────────────────────
    const handleWindowError = (event: ErrorEvent) => {
      // Los errores de render de React no llegan aquí (van a error.tsx),
      // pero los errores de scripts de terceros o timing sí.
      console.error("[GlobalErrorListeners] window.onerror:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        error: event.error,
      });
      // No mostramos toast para errores síncronos de window porque pueden ser
      // muy ruidosos (extensiones de browser, scripts de terceros).
      // Si se requiere telemetría, agregar aquí el envío al sistema de logs.
    };

    // ── offline / online ────────────────────────────────────────────────────
    const handleOffline = () => {
      notify.warning("Sin conexión", {
        description:
          "No hay conexión a internet. Algunas funciones no estarán disponibles hasta que te reconectes.",
      });
    };

    const handleOnline = () => {
      notify.success("Conexión restaurada", {
        description:
          "La conexión se restableció. Puedes continuar usando la aplicación.",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []); // mount once

  return null;
}
