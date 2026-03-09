/**
 * ICDAS System Constants
 * International Caries Detection and Assessment System
 */

export const ICDAS_LABELS: Record<number, string> = {
  0: '0 - Sano',
  1: '1 - Cambio visual',
  2: '2 - Cambio visual húmedo',
  3: '3 - Microcavitación',
  4: '4 - Sombra dentina',
  5: '5 - Cavitación',
  6: '6 - Cavitación extensa',
}

export const ICDAS_DESCRIPTIONS: Record<number, string> = {
  0: 'Sin evidencia de caries',
  1: 'Primer cambio visual en esmalte',
  2: 'Cambio visual distintivo en esmalte',
  3: 'Ruptura localizada del esmalte',
  4: 'Sombra oscura de dentina',
  5: 'Cavitación distintiva con dentina visible',
  6: 'Cavitación extensa con dentina visible',
}

export const ICDAS_COLORS: Record<number, string> = {
  0: '#10B981', // Verde - Sano
  1: '#FCA5A5', // Rojo muy claro
  2: '#F87171', // Rojo claro
  3: '#EF4444', // Rojo medio
  4: '#DC2626', // Rojo
  5: '#B91C1C', // Rojo oscuro
  6: '#991B1B', // Rojo muy oscuro
}

export const ICDAS_TREATMENT_RECOMMENDATIONS: Record<number, string[]> = {
  0: ['Mantenimiento', 'Controles periódicos'],
  1: ['Sellantes', 'Flúor tópico', 'Vigilancia'],
  2: ['Infiltración (Icon)', 'Sellantes', 'Flúor', 'Vigilancia'],
  3: ['Resina clase I/II simple', 'Restauración conservadora'],
  4: ['Resina compleja', 'Evaluar extensión'],
  5: ['Resina compleja', 'Onlay', 'Evaluar endodoncia si hay síntomas'],
  6: ['Restauración extensa', 'Onlay/Corona', 'Endodoncia probable'],
}
