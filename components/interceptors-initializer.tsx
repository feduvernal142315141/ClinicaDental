'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useInterceptor } from '@/contexts/interceptor-context'
import { setupInterceptorsWithContext } from '@/lib/services/interceptors-context-setup'
import { useAutoLogout } from '@/hooks/use-auto-logout'
import { AutoLogoutWarningModal } from './auto-logout-warning-modal'

/**
 * Componente para inicializar los interceptores de Axios con Context API y auto-logout
 * Este componente debe ser montado una vez en el layout principal
 */
export function InterceptorsInitializer() {
  const { user, logout } = useAuth()
  const [showWarningModal, setShowWarningModal] = useState(false)
  
  // Obtener el contexto de interceptores
  const interceptorContext = useInterceptor()

  // Configurar auto-logout
  const { resetActivity, clearActivity } = useAutoLogout({
    inactivityTimeMinutes: 15, // 15 minutos de inactividad total
    warningTimeMinutes: 13, // Mostrar advertencia 2 minutos antes
    enabled: !!user, // Solo activar si hay un usuario logueado
    onWarning: () => {
      console.warn('⚠️ Advertencia: La sesión está por expirar')
      setShowWarningModal(true)
    },
    onLogout: () => {
      console.warn('🔒 Sesión cerrada por inactividad')
      handleAutoLogout()
    },
  })

  // Configurar interceptores con Context API
  useEffect(() => {
    setupInterceptorsWithContext({
      setLoading: interceptorContext.setLoading,
      showNotification: interceptorContext.showNotification,
      handleHttpError: interceptorContext.handleHttpError,
      handleUnauthorized: interceptorContext.handleUnauthorized,
      onActivity: resetActivity, // Integración con auto-logout
    })
  }, [resetActivity, interceptorContext])

  // Manejar logout automático
  const handleAutoLogout = async () => {
    setShowWarningModal(false)
    clearActivity()
    await logout()
  }

  // Manejar continuar trabajando
  const handleContinue = () => {
    setShowWarningModal(false)
    resetActivity()
  }

  return (
    <>
      <AutoLogoutWarningModal
        isOpen={showWarningModal}
        onContinue={handleContinue}
        onLogout={handleAutoLogout}
      />
    </>
  )
}

