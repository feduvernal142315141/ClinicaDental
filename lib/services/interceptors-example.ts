/**
 * EJEMPLO DE INTEGRACIÓN CON REDUX
 * 
 * Este archivo muestra cómo configurar los interceptores de Axios
 * para trabajar con Redux y mostrar notificaciones/spinners
 * 
 * NOTA: Este es un archivo de ejemplo. Elimínalo o adáptalo cuando 
 * implementes Redux en tu proyecto.
 */

import { setInterceptorHandlers } from './apiConfig'
// import { store } from '@/store' // Tu store de Redux
// import { showNotification } from '@/store/slices/notificationSlice' // Tu slice de notificaciones
// import { setLoading } from '@/store/slices/loadingSlice' // Tu slice de loading
// import { logout } from '@/store/slices/authSlice' // Tu slice de auth

/**
 * Ejemplo de configuración de los handlers con Redux
 */
export const setupInterceptorsWithRedux = () => {
  setInterceptorHandlers({
    // Handler para activar el spinner de carga
    onLoadingStart: () => {
      // store.dispatch(setLoading(true))
      console.log('🔄 Cargando...')
    },

    // Handler para desactivar el spinner de carga
    onLoadingEnd: () => {
      // store.dispatch(setLoading(false))
      console.log('✅ Carga completada')
    },

    // Handler para mostrar notificaciones
    onNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
      // store.dispatch(showNotification({ message, type }))
      console.log(`📢 Notificación [${type}]: ${message}`)
    },

    // Handler para cerrar sesión cuando hay error 401
    onUnauthorized: () => {
      // store.dispatch(logout())
      // Redirigir a login
      // window.location.href = '/login'
      console.log('🔒 Usuario no autorizado - Sesión expirada')
    },

    // Handler para manejar errores 403 (Forbidden)
    onForbidden: () => {
      // Puedes redirigir a una página de "Sin permisos"
      // O simplemente mostrar un mensaje (ya se muestra con onNotification)
      console.log('🚫 Acceso prohibido')
    },
  })
}

/**
 * Ejemplo de uso en un componente React con useEffect
 * 
 * En tu componente principal (layout.tsx o _app.tsx):
 * 
 * useEffect(() => {
 *   setupInterceptorsWithRedux()
 * }, [])
 */

/**
 * Ejemplo alternativo sin Redux, usando Context API o hooks personalizados
 */
export const setupInterceptorsWithContextAPI = (
  showToast: (message: string, type: string) => void,
  setIsLoading: (loading: boolean) => void,
  handleLogout: () => void
) => {
  setInterceptorHandlers({
    onLoadingStart: () => setIsLoading(true),
    onLoadingEnd: () => setIsLoading(false),
    onNotification: (message, type) => showToast(message, type),
    onUnauthorized: handleLogout,
    onForbidden: () => {
      // Manejar forbidden
      showToast('No tienes permisos para esta acción', 'error')
    },
  })
}

/**
 * Ejemplo de uso con el sistema de toast existente (react-hot-toast o sonner)
 */
// import { toast } from 'sonner' // o 'react-hot-toast'
// 
// export const setupInterceptorsWithToast = () => {
//   setInterceptorHandlers({
//     onLoadingStart: () => {
//       // Opcional: mostrar un loading toast
//     },
//     onLoadingEnd: () => {
//       // Opcional: ocultar el loading toast
//     },
//     onNotification: (message, type) => {
//       switch (type) {
//         case 'success':
//           toast.success(message)
//           break
//         case 'error':
//           toast.error(message)
//           break
//         case 'warning':
//           toast.warning(message)
//           break
//         case 'info':
//           toast.info(message)
//           break
//       }
//     },
//     onUnauthorized: () => {
//       toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.')
//       // Redirigir a login
//       window.location.href = '/login'
//     },
//     onForbidden: () => {
//       toast.error('No tienes permisos para realizar esta acción.')
//     },
//   })
// }

