"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createInactivityWorker } from "@/lib/workers/worker-script";

export interface AutoLogoutConfig {
  inactivityTimeMinutes?: number; // Tiempo total antes del logout (default: 15 min)
  warningTimeMinutes?: number; // Tiempo antes de mostrar advertencia (default: 13 min)
  onWarning?: () => void; // Callback cuando se muestra la advertencia
  onLogout?: () => void; // Callback cuando se hace logout automático
  enabled?: boolean; // Si está habilitado o no (default: true)
}

interface UseAutoLogoutReturn {
  resetActivity: () => void;
  clearActivity: () => void;
  updateConfig: (config: Partial<AutoLogoutConfig>) => void;
  isWarningShown: boolean;
  timeRemaining: number | null;
}

/**
 * Hook personalizado para manejar auto-logout por inactividad
 *
 * @example
 * ```typescript
 * const { resetActivity, isWarningShown } = useAutoLogout({
 *   inactivityTimeMinutes: 15,
 *   warningTimeMinutes: 13,
 *   onWarning: () => setShowModal(true),
 *   onLogout: () => handleLogout(),
 * })
 * ```
 */
export const useAutoLogout = (
  config: AutoLogoutConfig = {},
): UseAutoLogoutReturn => {
  const {
    inactivityTimeMinutes = 15,
    warningTimeMinutes = 13,
    onWarning,
    onLogout,
    enabled = true,
  } = config;

  const workerRef = useRef<Worker | null>(null);
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [timeRemaining] = useState<number | null>(null);

  /**
   * Resetea el timer de actividad
   */
  const resetActivity = useCallback(() => {
    if (workerRef.current && enabled) {
      workerRef.current.postMessage({ type: "reset-activity" });
      setIsWarningShown(false);
    }
  }, [enabled]);

  /**
   * Limpia todos los timers (útil al hacer logout manual)
   */
  const clearActivity = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "logout" });
      setIsWarningShown(false);
    }
  }, []);

  /**
   * Actualiza la configuración del auto-logout
   */
  const updateConfig = useCallback((newConfig: Partial<AutoLogoutConfig>) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "update-config",
        inactivityTime: newConfig.inactivityTimeMinutes,
        warningTime: newConfig.warningTimeMinutes,
      });
    }
  }, []);

  /**
   * Inicializa el worker y configura los listeners
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Crear el worker
    workerRef.current = createInactivityWorker();

    // Manejar mensajes del worker
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { type } = event.data;

      switch (type) {
        case "warning":
          setIsWarningShown(true);
          onWarning?.();
          console.warn("⚠️ Advertencia: La sesión está por expirar");
          break;

        case "logout":
          setIsWarningShown(false);
          onLogout?.();
          console.warn("🔒 Sesión cerrada por inactividad");
          break;

        default:
          console.error("Tipo de mensaje desconocido del worker:", type);
      }
    };

    // Manejar errores del worker
    workerRef.current.onerror = (error) => {
      console.error("Error en el worker de inactividad:", error);
    };

    // Inicializar el worker con la configuración
    workerRef.current.postMessage({
      type: "init",
      inactivityTime: inactivityTimeMinutes,
      warningTime: warningTimeMinutes,
    });

    // Cleanup al desmontar
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [enabled, inactivityTimeMinutes, warningTimeMinutes, onWarning, onLogout]);

  /**
   * Agregar listeners de actividad del usuario
   * (clicks, teclas, movimiento del mouse)
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      resetActivity();
    };

    // Agregar listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetActivity]);

  return {
    resetActivity,
    clearActivity,
    updateConfig,
    isWarningShown,
    timeRemaining,
  };
};
