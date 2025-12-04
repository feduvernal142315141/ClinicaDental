/**
 * Configuración del sistema de auto-logout por inactividad
 */

export const AUTO_LOGOUT_CONFIG = {
  /**
   * Tiempo total de inactividad antes del logout automático (en minutos)
   * @default 15
   */
  INACTIVITY_TIME_MINUTES: 15,

  /**
   * Tiempo antes de mostrar la advertencia de inactividad (en minutos)
   * Debe ser menor que INACTIVITY_TIME_MINUTES
   * @default 13 (2 minutos antes del logout)
   */
  WARNING_TIME_MINUTES: 13,

  /**
   * Tiempo que el usuario tiene para decidir después de la advertencia (en minutos)
   * Calculado automáticamente: INACTIVITY_TIME_MINUTES - WARNING_TIME_MINUTES
   */
  get TIME_TO_DECIDE_MINUTES() {
    return this.INACTIVITY_TIME_MINUTES - this.WARNING_TIME_MINUTES;
  },
} as const;
