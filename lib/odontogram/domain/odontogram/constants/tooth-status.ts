/**
 * Tooth Global Status Constants
 */

export type ToothGlobalStatus = 'healthy' | 'absent' | 'implant' | 'endodontic' | 'crown'

export const GLOBAL_STATUS_LABELS: Record<ToothGlobalStatus, string> = {
  healthy: 'Sano',
  absent: 'Ausente',
  implant: 'Implante',
  endodontic: 'Endo',
  crown: 'Corona',
}

export const GLOBAL_STATUS_COLORS: Record<ToothGlobalStatus, string> = {
  healthy: '#10B981',   // Verde
  absent: '#6B7280',    // Gris
  implant: '#8B5CF6',   // Púrpura
  endodontic: '#EF4444', // Rojo
  crown: '#F59E0B',     // Ámbar
}

export const GLOBAL_STATUS_DESCRIPTIONS: Record<ToothGlobalStatus, string> = {
  healthy: 'Diente sano sin tratamientos mayores',
  absent: 'Diente ausente o extraído',
  implant: 'Implante dental',
  endodontic: 'Tratamiento endodóntico realizado',
  crown: 'Corona o prótesis fija',
}
