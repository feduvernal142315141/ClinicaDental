/**
 * Web Worker para manejar el timer de inactividad
 * 
 * Este worker corre en un hilo separado para no bloquear la UI
 * y maneja los timers de inactividad del usuario.
 */

interface WorkerMessage {
  type: 'init' | 'reset-activity' | 'logout' | 'update-config'
  inactivityTime?: number // Tiempo en minutos antes del logout
  warningTime?: number // Tiempo en minutos antes de mostrar advertencia
}

let inactivityTimer: NodeJS.Timeout | null = null
let warningTimer: NodeJS.Timeout | null = null

let inactivityTimeMinutes = 15 // Por defecto 15 minutos
let warningTimeMinutes = 13 // Por defecto 13 minutos (advertencia 2 min antes)

/**
 * Limpia todos los timers activos
 */
const clearTimers = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }
  if (warningTimer) {
    clearTimeout(warningTimer)
    warningTimer = null
  }
}

/**
 * Inicia los timers de inactividad
 */
const startTimers = () => {
  clearTimers()

  // Timer para mostrar advertencia
  const warningMs = warningTimeMinutes * 60 * 1000
  warningTimer = setTimeout(() => {
    self.postMessage({ type: 'warning' })
  }, warningMs)

  // Timer para hacer logout automático
  const inactivityMs = inactivityTimeMinutes * 60 * 1000
  inactivityTimer = setTimeout(() => {
    self.postMessage({ type: 'logout' })
  }, inactivityMs)
}

/**
 * Maneja los mensajes del hilo principal
 */
self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, inactivityTime, warningTime } = event.data

  switch (type) {
    case 'init':
      // Inicializar el worker con los tiempos configurados
      if (inactivityTime) {
        inactivityTimeMinutes = inactivityTime
      }
      if (warningTime) {
        warningTimeMinutes = warningTime
      }
      startTimers()
      break

    case 'reset-activity':
      // Resetear los timers cuando hay actividad del usuario
      startTimers()
      break

    case 'logout':
      // Limpiar timers cuando el usuario hace logout manual
      clearTimers()
      break

    case 'update-config':
      // Actualizar configuración de tiempos
      if (inactivityTime) {
        inactivityTimeMinutes = inactivityTime
      }
      if (warningTime) {
        warningTimeMinutes = warningTime
      }
      // Reiniciar con la nueva configuración
      startTimers()
      break

    default:
      console.error('Tipo de mensaje no reconocido:', type)
  }
}

export {}

