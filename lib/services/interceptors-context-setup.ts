/**
 * CONFIGURACIÓN DE INTERCEPTORES CON CONTEXT API
 * 
 * Este archivo configura los interceptores de Axios para usar
 * el InterceptorContext en lugar de Redux.
 */

import { setInterceptorHandlers } from './apiConfig'

// ============================================
// TIPO DE CONFIGURACIÓN
// ============================================

interface InterceptorConfig {
  setLoading: (loading: boolean) => void
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  handleHttpError: (statusCode: number, message?: string) => void
  handleUnauthorized: () => void
  onActivity?: () => void
}

// ============================================
// CONFIGURACIÓN CON CONTEXT API
// ============================================

/**
 * Configura los interceptores usando el InterceptorContext
 * 
 * @example
 * ```tsx
 * // En tu componente de inicialización
 * import { useInterceptor } from '@/contexts/interceptor-context'
 * import { setupInterceptorsWithContext } from '@/lib/services/interceptors-context-setup'
 * 
 * function InterceptorsInitializer() {
 *   const interceptorContext = useInterceptor()
 *   
 *   useEffect(() => {
 *     setupInterceptorsWithContext(interceptorContext)
 *   }, [])
 *   
 *   return null
 * }
 * ```
 */
export const setupInterceptorsWithContext = (config: InterceptorConfig) => {
  setInterceptorHandlers({
    // Activar loading cuando comienza una petición
    onLoadingStart: () => {
      config.setLoading(true)
    },

    // Desactivar loading cuando termina una petición
    onLoadingEnd: () => {
      config.setLoading(false)
    },

    // Resetear timer de inactividad en cada petición
    onActivity: () => {
      config.onActivity?.()
    },

    // Mostrar notificaciones
    onNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
      config.showNotification(message, type)
    },

    // Manejo de error 401 (Unauthorized)
    onUnauthorized: () => {
      config.handleUnauthorized()
    },

    // Manejo de error 403 (Forbidden)
    onForbidden: () => {
      config.handleHttpError(403)
    },
  })
}

// ============================================
// CONFIGURACIÓN SIMPLIFICADA (SOLO LO ESENCIAL)
// ============================================

/**
 * Versión simplificada que solo necesita las funciones básicas
 * 
 * @example
 * ```tsx
 * const { setLoading, showNotification } = useInterceptor()
 * 
 * useEffect(() => {
 *   setupInterceptorsSimple({
 *     setLoading,
 *     showNotification,
 *   })
 * }, [])
 * ```
 */
export const setupInterceptorsSimple = (
  setLoading: (loading: boolean) => void,
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
  setInterceptorHandlers({
    onLoadingStart: () => setLoading(true),
    onLoadingEnd: () => setLoading(false),
    onNotification: showNotification,
    onUnauthorized: () => {
      showNotification('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    },
    onForbidden: () => {
      showNotification('No tienes permisos para realizar esta acción.', 'error')
    },
  })
}

// ============================================
// CONFIGURACIÓN CON AUTO-LOGOUT
// ============================================

/**
 * Configuración que incluye integración con el sistema de auto-logout
 * 
 * @example
 * ```tsx
 * const interceptorContext = useInterceptor()
 * const { resetTimer } = useAutoLogout()
 * 
 * useEffect(() => {
 *   setupInterceptorsWithAutoLogout(interceptorContext, resetTimer)
 * }, [])
 * ```
 */
export const setupInterceptorsWithAutoLogout = (
  config: InterceptorConfig,
  resetActivityTimer: () => void
) => {
  setupInterceptorsWithContext({
    ...config,
    onActivity: resetActivityTimer
  })
}

