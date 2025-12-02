"use client"

/**
 * CONTEXT API PARA INTERCEPTORES
 * 
 * Este contexto maneja el estado global de:
 * - Loading/Spinner global
 * - Notificaciones y alertas
 * - Manejo de errores HTTP
 * 
 * Se integra perfectamente con los interceptores de Axios
 */

import { createContext, useContext, useState, ReactNode } from "react"
import { toast } from "sonner"

// ============================================
// TIPOS
// ============================================

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  message: string
  type: NotificationType
  timestamp: number
}

interface AlertDialogData {
  isOpen: boolean
  title: string
  description: string
  type: 'error' | 'warning' | 'info'
}

interface InterceptorContextType {
  // Estado de loading
  isLoading: boolean
  activeRequests: number
  setLoading: (loading: boolean) => void
  
  // Notificaciones
  notifications: Notification[]
  showNotification: (message: string, type: NotificationType) => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
  
  // Alert Dialog (para errores críticos)
  alertDialog: AlertDialogData
  showAlert: (title: string, description: string, type?: 'error' | 'warning' | 'info') => void
  closeAlert: () => void
  
  // Manejo de errores HTTP
  handleHttpError: (statusCode: number, message?: string) => void
  
  // Manejo de unauthorized (401)
  handleUnauthorized: () => void
  
  // Reset de actividad (para auto-logout)
  onActivity?: () => void
  setOnActivity: (callback: () => void) => void
}

// ============================================
// CONTEXT
// ============================================

const InterceptorContext = createContext<InterceptorContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

export function InterceptorProvider({ children }: { children: ReactNode }) {
  // Estado de loading
  const [isLoading, setIsLoading] = useState(false)
  const [activeRequests, setActiveRequests] = useState(0)
  
  // Estado de notificaciones
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  // Estado de AlertDialog
  const [alertDialog, setAlertDialog] = useState<AlertDialogData>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  })
  
  // Callback de actividad (para auto-logout)
  const [onActivity, setOnActivity] = useState<(() => void) | undefined>(undefined)

  // ============================================
  // FUNCIONES DE LOADING
  // ============================================
  
  const setLoading = (loading: boolean) => {
    setActiveRequests(prev => {
      const newCount = loading ? prev + 1 : Math.max(0, prev - 1)
      setIsLoading(newCount > 0)
      return newCount
    })
  }

  // ============================================
  // FUNCIONES DE NOTIFICACIONES
  // ============================================
  
  const showNotification = (message: string, type: NotificationType) => {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: Date.now()
    }
    
    setNotifications(prev => [...prev, notification])
    
    // Mostrar toast
    switch (type) {
      case 'success':
        toast.success(message)
        break
      case 'error':
        toast.error(message)
        break
      case 'warning':
        toast.warning(message)
        break
      case 'info':
        toast.info(message)
        break
    }
    
    // Auto-limpiar después de 5 segundos
    setTimeout(() => {
      clearNotification(notification.id)
    }, 5000)
  }
  
  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  const clearAllNotifications = () => {
    setNotifications([])
  }

  // ============================================
  // FUNCIONES DE ALERT DIALOG
  // ============================================
  
  const showAlert = (
    title: string, 
    description: string, 
    type: 'error' | 'warning' | 'info' = 'info'
  ) => {
    setAlertDialog({
      isOpen: true,
      title,
      description,
      type
    })
  }
  
  const closeAlert = () => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }))
  }

  // ============================================
  // MANEJO DE ERRORES HTTP
  // ============================================
  
  const handleHttpError = (statusCode: number, message?: string) => {
    switch (statusCode) {
      case 400:
        showNotification(message || 'La solicitud contiene datos inválidos', 'error')
        break
      case 401:
        handleUnauthorized()
        break
      case 403:
        showAlert(
          'Acceso Denegado',
          message || 'No tienes los permisos necesarios para realizar esta acción. Contacta al administrador si crees que esto es un error.',
          'error'
        )
        break
      case 404:
        showNotification(message || 'El recurso solicitado no existe', 'error')
        break
      case 422:
        showNotification(message || 'Los datos proporcionados no son válidos', 'error')
        break
      case 500:
        showAlert(
          'Error del Servidor',
          message || 'Ocurrió un error en el servidor. Por favor, intenta nuevamente más tarde.',
          'error'
        )
        break
      case 502:
        showAlert(
          'Servicio No Disponible',
          'El servidor no está respondiendo. Por favor, intenta nuevamente en unos momentos.',
          'error'
        )
        break
      case 503:
        showAlert(
          'Servicio en Mantenimiento',
          'El servicio está temporalmente fuera de línea. Por favor, intenta nuevamente más tarde.',
          'warning'
        )
        break
      default:
        showNotification(message || 'Ocurrió un error inesperado', 'error')
    }
  }
  
  const handleUnauthorized = () => {
    showAlert(
      'Sesión Expirada',
      'Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.',
      'warning'
    )
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
      window.location.href = '/login'
    }, 2000)
  }

  // ============================================
  // VALUE DEL CONTEXT
  // ============================================
  
  const value: InterceptorContextType = {
    // Loading
    isLoading,
    activeRequests,
    setLoading,
    
    // Notificaciones
    notifications,
    showNotification,
    clearNotification,
    clearAllNotifications,
    
    // Alert Dialog
    alertDialog,
    showAlert,
    closeAlert,
    
    // Errores HTTP
    handleHttpError,
    handleUnauthorized,
    
    // Actividad
    onActivity,
    setOnActivity
  }

  return (
    <InterceptorContext.Provider value={value}>
      {children}
    </InterceptorContext.Provider>
  )
}

// ============================================
// HOOK PERSONALIZADO
// ============================================

export function useInterceptor(): InterceptorContextType {
  const context = useContext(InterceptorContext)
  if (!context) {
    throw new Error("useInterceptor debe usarse dentro de un InterceptorProvider")
  }
  return context
}

// ============================================
// HOOKS DE UTILIDAD
// ============================================

/**
 * Hook para obtener solo el estado de loading
 */
export function useGlobalLoading() {
  const { isLoading, activeRequests } = useInterceptor()
  return { isLoading, activeRequests }
}

/**
 * Hook para mostrar notificaciones fácilmente
 */
export function useNotifications() {
  const { showNotification, notifications, clearNotification, clearAllNotifications } = useInterceptor()
  return { 
    showNotification,
    notifications, 
    clearNotification, 
    clearAllNotifications,
    // Helpers
    showSuccess: (message: string) => showNotification(message, 'success'),
    showError: (message: string) => showNotification(message, 'error'),
    showWarning: (message: string) => showNotification(message, 'warning'),
    showInfo: (message: string) => showNotification(message, 'info'),
  }
}

/**
 * Hook para manejar alerts
 */
export function useAlerts() {
  const { alertDialog, showAlert, closeAlert } = useInterceptor()
  return { 
    alertDialog, 
    showAlert, 
    closeAlert,
    // Helpers
    showError: (title: string, description: string) => showAlert(title, description, 'error'),
    showWarning: (title: string, description: string) => showAlert(title, description, 'warning'),
    showInfo: (title: string, description: string) => showAlert(title, description, 'info'),
  }
}

