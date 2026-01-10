"use client";

/**
 * INICIALIZADOR DE INTERCEPTORES CON CONTEXT API
 *
 * Este componente configura los interceptores de Axios para usar
 * el InterceptorContext en lugar de Redux.
 *
 * Debe ser usado dentro del InterceptorProvider.
 */

import { useEffect } from "react";
import { useInterceptor } from "@/lib/contexts/interceptor-context";
import { setupInterceptorsWithContext } from "@/lib/services/interceptors-context-setup";

export function InterceptorsContextInitializer() {
  const interceptorContext = useInterceptor();

  useEffect(() => {
    // Configurar los interceptores con el context
    setupInterceptorsWithContext({
      setLoading: interceptorContext.setLoading,
      showNotification: interceptorContext.showNotification,
      handleHttpError: interceptorContext.handleHttpError,
      handleUnauthorized: interceptorContext.handleUnauthorized,
      onActivity: interceptorContext.onActivity,
    });

    console.log("✅ Interceptores configurados con Context API");
  }, []); // Solo se ejecuta una vez al montar

  return null;
}
