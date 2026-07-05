/**
 * Tooth Global Status Constants
 */

export type ToothGlobalStatus =
  | 'healthy'
  | 'extraction'
  | 'absent_pending'
  | 'absent_done'
  | 'endodontic'
  | 'crown'
  | 'implant'

export const GLOBAL_STATUS_LABELS: Record<ToothGlobalStatus, string> = {
  healthy: 'Sano',
  extraction: 'Extracción',
  absent_pending: 'Ausente (pend.)',
  absent_done: 'Ausente (hecha)',
  endodontic: 'Endodoncia',
  crown: 'Corona',
  implant: 'Implante',
}

export const GLOBAL_STATUS_COLORS: Record<ToothGlobalStatus, string> = {
  healthy: '#10B981',        // Verde
  extraction: '#DC2626',     // Rojo (pieza rellena de rojo)
  absent_pending: '#2563EB', // Azul (cruz pendiente)
  absent_done: '#DC2626',    // Rojo (cruz hecha)
  endodontic: '#1F2937',     // Neutro/ink (texto ENDO)
  crown: '#6B7280',          // Neutro (círculo)
  implant: '#8B5CF6',        // Morado
}

export const GLOBAL_STATUS_DESCRIPTIONS: Record<ToothGlobalStatus, string> = {
  healthy: 'Diente sano sin tratamientos mayores',
  extraction: 'Extracción indicada (pieza marcada en rojo)',
  absent_pending: 'Ausencia pendiente (cruz azul)',
  absent_done: 'Ausencia confirmada (cruz roja)',
  endodontic: 'Tratamiento endodóntico (ENDO)',
  crown: 'Corona o prótesis fija (círculo)',
  implant: 'Implante dental',
}
