/**
 * Clinical Event Type Constants
 */

export type ClinicalEventType =
  | 'diagnosis'
  | 'plan'
  | 'performed'
  | 'perio'
  | 'prosthesis'
  | 'endo'
  | 'implante'
  | 'ausente'

export type ClinicalEventStatus = 
  | 'open' 
  | 'plan' 
  | 'in_progress' 
  | 'done' 
  | 'canceled' 
  | 'observation'

export const CLINICAL_EVENT_TYPE_LABELS: Record<ClinicalEventType, string> = {
  diagnosis: 'Diagnóstico',
  plan: 'Plan',
  performed: 'Realizado',
  perio: 'Periodoncia',
  prosthesis: 'Prótesis',
  endo: 'Endodoncia',
  implante: 'Implante',
  ausente: 'Ausente',
}

export const CLINICAL_EVENT_STATUS_LABELS: Record<ClinicalEventStatus, string> = {
  open: 'Abierto',
  plan: 'Planificado',
  in_progress: 'En Progreso',
  done: 'Realizado',
  canceled: 'Cancelado',
  observation: 'Observación',
}

export const CLINICAL_EVENT_TYPE_COLORS: Record<ClinicalEventType, string> = {
  diagnosis: '#DC2626',  // Rojo - Caries/Patología
  plan: '#F59E0B',       // Ámbar - Plan
  performed: '#3B82F6',  // Azul - Realizado
  perio: '#14B8A6',      // Teal - Periodoncia
  prosthesis: '#F59E0B', // Ámbar - Prótesis
  endo: '#8B5CF6',       // Morado - Endodoncia
  implante: '#6B7280',   // Gris - Implante
  ausente: '#6B7280',    // Gris - Ausente
}

export const CLINICAL_EVENT_STATUS_COLORS: Record<ClinicalEventStatus, string> = {
  open: '#DC2626',       // Rojo - Patología/Diagnóstico abierto
  plan: '#F59E0B',       // Ámbar - Plan
  in_progress: '#8B5CF6', // Lila - En curso
  done: '#3B82F6',       // Azul - Realizado/Existente
  canceled: '#6B7280',   // Gris - Cancelado
  observation: '#F59E0B', // Ámbar - Observación
}
