/**
 * Configuración de Interceptores de Axios
 *
 * Este archivo proporciona diferentes métodos para configurar los interceptores
 * según tus necesidades actuales del proyecto.
 */

import { setInterceptorHandlers } from "./apiConfig";
import { toast } from "sonner";

/**
 * Configuración básica usando Sonner para notificaciones
 * Esta es la configuración recomendada para empezar
 */
export const setupInterceptorsBasic = (resetActivityCallback?: () => void) => {
  setInterceptorHandlers({
    onLoadingStart: () => {
      // Por ahora solo log, puedes implementar un loading global después
      console.log("🔄 Iniciando petición...");
    },

    onLoadingEnd: () => {
      console.log("✅ Petición completada");
    },

    onActivity: () => {
      // Resetear el timer de inactividad cuando hay peticiones HTTP
      resetActivityCallback?.();
    },

    onNotification: (
      message: string,
      type: "success" | "error" | "warning" | "info",
    ) => {
      // Usar Sonner para mostrar notificaciones toast
      switch (type) {
        case "success":
          toast.success(message);
          break;
        case "error":
          toast.error(message);
          break;
        case "warning":
          toast.warning(message);
          break;
        case "info":
          toast.info(message);
          break;
      }
    },

    onUnauthorized: () => {
      toast.error(
        "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
      );
      // Esperar un momento para que se vea el toast antes de redirigir
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    },

    onForbidden: () => {
      toast.error("No tienes permisos para realizar esta acción.");
    },
  });
};

/**
 * Configuración avanzada usando AlertContext
 * Úsalo si prefieres usar el sistema de AlertDialog en lugar de toast
 */
export const setupInterceptorsWithAlertContext = (
  showError: (title: string, description?: string) => void,
  showSuccess: (title: string, description?: string) => void,
  resetActivityCallback?: () => void,
) => {
  setInterceptorHandlers({
    onLoadingStart: () => {
      console.log("🔄 Iniciando petición...");
    },

    onLoadingEnd: () => {
      console.log("✅ Petición completada");
    },

    onActivity: () => {
      resetActivityCallback?.();
    },

    onNotification: (
      message: string,
      type: "success" | "error" | "warning" | "info",
    ) => {
      // Usar AlertContext para errores graves y Sonner para notificaciones leves
      if (type === "error") {
        showError("Error", message);
      } else if (type === "success") {
        // Para éxitos, usar toast es menos intrusivo
        toast.success(message);
      } else {
        // Para warnings e info, usar toast también
        if (type === "warning") {
          toast.warning(message);
        } else {
          toast.info(message);
        }
      }
    },

    onUnauthorized: () => {
      showError(
        "Sesión Expirada",
        "Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.",
      );
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    },

    onForbidden: () => {
      showError(
        "Acceso Denegado",
        "No tienes los permisos necesarios para realizar esta acción.",
      );
    },
  });
};

/**
 * Configuración con soporte para loading spinner global
 * Úsalo cuando implementes un componente de loading global
 */
export const setupInterceptorsWithLoading = (
  setGlobalLoading: (loading: boolean) => void,
  resetActivityCallback?: () => void,
) => {
  let activeRequests = 0;

  setInterceptorHandlers({
    onLoadingStart: () => {
      activeRequests++;
      setGlobalLoading(true);
    },

    onLoadingEnd: () => {
      activeRequests--;
      // Solo desactivar loading cuando no hay peticiones activas
      if (activeRequests <= 0) {
        activeRequests = 0;
        setGlobalLoading(false);
      }
    },

    onActivity: () => {
      resetActivityCallback?.();
    },

    onNotification: (
      message: string,
      type: "success" | "error" | "warning" | "info",
    ) => {
      switch (type) {
        case "success":
          toast.success(message);
          break;
        case "error":
          toast.error(message);
          break;
        case "warning":
          toast.warning(message);
          break;
        case "info":
          toast.info(message);
          break;
      }
    },

    onUnauthorized: () => {
      toast.error(
        "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
      );
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    },

    onForbidden: () => {
      toast.error("No tienes permisos para realizar esta acción.");
    },
  });
};

/**
 * Configuración híbrida (Recomendada)
 * Combina Sonner para notificaciones rápidas y AlertContext para acciones críticas
 */
export const setupInterceptorsHybrid = (
  showError: (title: string, description?: string) => void,
  setGlobalLoading?: (loading: boolean) => void,
  resetActivityCallback?: () => void,
) => {
  let activeRequests = 0;

  setInterceptorHandlers({
    onLoadingStart: () => {
      if (setGlobalLoading) {
        activeRequests++;
        setGlobalLoading(true);
      }
    },

    onLoadingEnd: () => {
      if (setGlobalLoading) {
        activeRequests--;
        if (activeRequests <= 0) {
          activeRequests = 0;
          setGlobalLoading(false);
        }
      }
    },

    onActivity: () => {
      resetActivityCallback?.();
    },

    onNotification: (
      message: string,
      type: "success" | "error" | "warning" | "info",
    ) => {
      // Errores 500 y 403 usan AlertDialog (más críticos)
      if (
        type === "error" &&
        (message.includes("servidor") || message.includes("permisos"))
      ) {
        showError("Error", message);
      } else {
        // El resto usa toast (menos intrusivo)
        switch (type) {
          case "success":
            toast.success(message);
            break;
          case "error":
            toast.error(message);
            break;
          case "warning":
            toast.warning(message);
            break;
          case "info":
            toast.info(message);
            break;
        }
      }
    },

    onUnauthorized: () => {
      // Error 401 usa AlertDialog porque es crítico
      showError(
        "Sesión Expirada",
        "Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.",
      );
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    },

    onForbidden: () => {
      // Error 403 usa AlertDialog porque es crítico
      showError(
        "Acceso Denegado",
        "No tienes los permisos necesarios para realizar esta acción. Contacta al administrador si crees que esto es un error.",
      );
    },
  });
};

/**
 * Configuración para Redux (cuando lo implementes)
 */
// export const setupInterceptorsWithRedux = () => {
//   setInterceptorHandlers({
//     onLoadingStart: () => {
//       store.dispatch(setLoading(true))
//     },
//     onLoadingEnd: () => {
//       store.dispatch(setLoading(false))
//     },
//     onNotification: (message, type) => {
//       store.dispatch(addNotification({ message, type }))
//     },
//     onUnauthorized: () => {
//       store.dispatch(logout())
//       toast.error('Sesión expirada')
//       setTimeout(() => {
//         window.location.href = '/login'
//       }, 1500)
//     },
//     onForbidden: () => {
//       store.dispatch(addNotification({
//         message: 'No tienes permisos para esta acción',
//         type: 'error'
//       }))
//     },
//   })
// }
