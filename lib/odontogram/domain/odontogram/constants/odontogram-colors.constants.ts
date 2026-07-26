/**
 * SISTEMA DE COLORES PROFESIONAL PARA ODONTOGRAMA
 * Basado en estándares internacionales de odontología
 * 
 * FILOSOFÍA:
 * - COLORES = ESTADO CLÍNICO (qué necesita el diente)
 * - SÍMBOLOS = TIPO DE TRATAMIENTO (qué se hace/hizo)
 * - PATRONES = CATEGORÍA (endodoncia, prótesis, etc.)
 */

/**
 * COLORES BASE POR ESTADO CLÍNICO
 * Estos son los colores que se ven en el odontograma
 */
export const ODONTOGRAM_STATE_COLORS = {
  // PATOLOGÍA ACTIVA - Rampa monótona de rojos (ICDAS 1→6) con contraste WCAG
  // suficiente incluso a fillOpacity 0.75 sobre blanco (1-2 ya NO casi-invisibles).
  // Fuente única de verdad ICDAS→color: la consumen grilla y modal por igual.
  CARIES_ACTIVE: {
    1: "#FCA5A5", // ICDAS 1 - Mancha blanca (rojo claro pero visible)
    2: "#F87171", // ICDAS 2 - Cambio de color
    3: "#EF4444", // ICDAS 3 - Microcavidad
    4: "#DC2626", // ICDAS 4 - Sombra dentina
    5: "#B91C1C", // ICDAS 5 - Cavidad pequeña
    6: "#991B1B", // ICDAS 6 - Cavidad extensa
  },
  
  // TRABAJOS PLANIFICADOS - Amarillo/Naranja
  PLANNED: "#FFA726",        // Naranja - Trabajo pendiente
  PLANNED_URGENT: "#FF6F00", // Naranja oscuro - Urgente
  
  // TRABAJOS REALIZADOS - Azul
  COMPLETED: "#42A5F5",      // Azul - Tratamiento completado
  COMPLETED_RECENT: "#1E88E5", // Azul oscuro - Reciente (últimos 30 días)
  
  // ESTADOS ESPECIALES
  ABSENT: "#424242",         // Gris oscuro - Diente ausente
  IMPLANT: "#9C27B0",        // Morado - Implante
  CROWN: "#7E57C2",          // Morado claro - Corona
  ENDODONTIC: "#D32F2F",     // Rojo oscuro - Tratamiento de conducto
  EXTRACTION: "#D32F2F",     // Rojo - Extracción indicada (pieza rellena de rojo)
  
  // OBSERVACIÓN Y PREVENTIVO
  OBSERVATION: "#FFB74D",    // Amarillo - Bajo observación
  PREVENTIVE: "#66BB6A",     // Verde - Tratamiento preventivo
  
  // SANO
  HEALTHY: "#FAFAF8",        // Beige muy claro - Diente sano (color diente natural)
  
  // TRANSPARENTE (sin diagnóstico)
  NONE: "transparent",
} as const

/**
 * COLORES DE SÍMBOLO (canal independiente del relleno de pieza).
 * Los usa el render para pintar la cruz (✕), el texto "ENDO" y el anillo de
 * corona. Solo 'implant' rellena la pieza; el resto marca con símbolo.
 *
 * Regla del odontograma: ROJO = por hacer, AZUL = realizado. El mismo glifo
 * cambia de color según el eje, igual que el anillo de corona.
 */
export const SYMBOL_COLORS = {
  INK: "#1F2937",                 // Neutro (ENDO)
  EXTRACTION_INDICATED: "#D32F2F", // Rojo (✕ exodoncia indicada)
  ABSENT: "#2563EB",              // Azul (✕ pieza ausente)
  CROWN_PENDING: "#D32F2F",       // Rojo (anillo corona por hacer)
  CROWN_DONE: "#2563EB",          // Azul (anillo corona realizada)
} as const

/**
 * SÍMBOLOS/MARCAS PARA TIPOS DE TRATAMIENTO
 * Estos se dibujan DENTRO del diente para indicar QUÉ tipo de trabajo es
 */
export const TREATMENT_SYMBOLS = {
  RESTORATION: {
    symbol: "R",
    pattern: "solid",
    description: "Restauración (amalgama/resina)",
  },
  ENDODONTICS: {
    symbol: "E",
    pattern: "diagonal-lines",
    description: "Endodoncia",
  },
  CROWN: {
    symbol: "C",
    pattern: "crosshatch",
    description: "Corona/Prótesis fija",
  },
  IMPLANT: {
    symbol: "I",
    pattern: "dots",
    description: "Implante",
  },
  EXTRACTION: {
    symbol: "X",
    pattern: "cross",
    description: "Extracción",
  },
  BRIDGE: {
    symbol: "B",
    pattern: "horizontal-lines",
    description: "Puente",
  },
  PREVENTIVE: {
    symbol: "P",
    pattern: "circle",
    description: "Preventivo (sellante/fluoruro)",
  },
  PROSTHESIS: {
    symbol: "PR",
    pattern: "grid",
    description: "Prótesis removible",
  },
} as const

/**
 * CATEGORÍAS DE PROCEDIMIENTOS CON SUS COLORES
 * Se usan para la leyenda y para agrupar tratamientos
 */
export const PROCEDURE_CATEGORY_DISPLAY = {
  restaurador: {
    label: "Restaurador",
    icon: "R",
    color: "#42A5F5", // Azul cuando está completado
    plannedColor: "#FFA726", // Naranja cuando está planificado
  },
  endodoncia: {
    label: "Endodoncia",
    icon: "E",
    color: "#D32F2F", // Rojo oscuro
    plannedColor: "#FF6F00",
  },
  protesis: {
    label: "Prótesis",
    icon: "C",
    color: "#7E57C2", // Morado
    plannedColor: "#BA68C8",
  },
  implante: {
    label: "Implante",
    icon: "I",
    color: "#9C27B0", // Morado oscuro
    plannedColor: "#AB47BC",
  },
  preventivo: {
    label: "Preventivo",
    icon: "P",
    color: "#66BB6A", // Verde
    plannedColor: "#81C784",
  },
  periodoncia: {
    label: "Periodoncia",
    icon: "Pe",
    color: "#26A69A", // Turquesa
    plannedColor: "#4DB6AC",
  },
  estetico: {
    label: "Estético",
    icon: "Es",
    color: "#EC407A", // Rosa
    plannedColor: "#F06292",
  },
  cirugia: {
    label: "Cirugía",
    icon: "X",
    color: "#78909C", // Gris azulado
    plannedColor: "#90A4AE",
  },
} as const

/**
 * LEYENDA PROFESIONAL
 * Lo que se muestra al usuario para entender el odontograma
 */
export const ODONTOGRAM_LEGEND_ITEMS = [
  // ESTADOS CLÍNICOS
  {
    label: "Sano",
    color: ODONTOGRAM_STATE_COLORS.HEALTHY,
    type: "state" as const,
    order: 1,
  },
  {
    label: "Caries (ICDAS 1-6)",
    color: ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[3],
    gradient: [
      ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[1],
      ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[6],
    ],
    type: "state" as const,
    order: 2,
  },
  {
    label: "Planificado",
    color: ODONTOGRAM_STATE_COLORS.PLANNED,
    type: "state" as const,
    order: 3,
  },
  {
    label: "Realizado",
    color: ODONTOGRAM_STATE_COLORS.COMPLETED,
    type: "state" as const,
    order: 4,
  },
  {
    label: "Extracción indicada (✕ roja)",
    color: ODONTOGRAM_STATE_COLORS.NONE,
    symbol: "✕",
    symbolColor: SYMBOL_COLORS.EXTRACTION_INDICATED,
    type: "symbol" as const,
    order: 5,
  },
  {
    label: "Ausente (✕ azul)",
    color: ODONTOGRAM_STATE_COLORS.NONE,
    symbol: "✕",
    symbolColor: SYMBOL_COLORS.ABSENT,
    type: "symbol" as const,
    order: 6,
  },
  {
    label: "Endodoncia (ENDO)",
    color: ODONTOGRAM_STATE_COLORS.NONE,
    symbol: "ENDO",
    symbolColor: SYMBOL_COLORS.INK,
    type: "symbol" as const,
    order: 8,
  },
  {
    label: "Corona por hacer (anillo)",
    color: ODONTOGRAM_STATE_COLORS.NONE,
    symbol: "◯",
    symbolColor: SYMBOL_COLORS.CROWN_PENDING,
    type: "symbol" as const,
    order: 9,
  },
  {
    label: "Corona hecha (anillo)",
    color: ODONTOGRAM_STATE_COLORS.NONE,
    symbol: "◯",
    symbolColor: SYMBOL_COLORS.CROWN_DONE,
    type: "symbol" as const,
    order: 10,
  },
  {
    label: "Implante",
    color: ODONTOGRAM_STATE_COLORS.IMPLANT,
    type: "state" as const,
    order: 11,
  },
  {
    label: "Observación",
    color: ODONTOGRAM_STATE_COLORS.OBSERVATION,
    type: "state" as const,
    order: 12,
  },
  {
    label: "Preventivo",
    color: ODONTOGRAM_STATE_COLORS.PREVENTIVE,
    type: "state" as const,
    order: 13,
  },
] as const

/**
 * PRIORIDADES DE COLOR
 * Cuando un diente tiene múltiples eventos, se usa este orden de prioridad
 * (de mayor a menor prioridad)
 * 
 * LÓGICA OPCIÓN C (MIXTO):
 * - Caries SEVERAS (ICDAS 5-6) tienen prioridad sobre tratamientos realizados
 * - Tratamientos realizados tienen prioridad sobre caries LEVES/MEDIAS (ICDAS 1-4)
 * - Esto permite que un diente tratado se vea AZUL, pero si tiene caries severa se vea ROJO
 */
export const COLOR_PRIORITY_ORDER = [
  "absent",           // 1. Ausente (negro)
  "implant",          // 2. Implante (morado oscuro)
  "caries-urgent",    // 3. Caries severa ICDAS 5-6 (rojo intenso) - EMERGENCIA
  "endodontic",       // 4. Endodoncia (rojo oscuro)
  "completed",        // 5. Realizado (azul) ⬆️ SUBIÓ - Ahora tiene prioridad sobre caries leves/medias
  "crown",            // 6. Corona (morado claro)
  "caries-active",    // 7. Caries activa ICDAS 3-4 (rojo medio) ⬇️ BAJÓ - Después de realizado
  "planned-urgent",   // 8. Planificado urgente (naranja oscuro)
  "caries-initial",   // 9. Caries inicial ICDAS 1-2 (rojo claro) ⬇️ BAJÓ - Después de realizado
  "planned",          // 10. Planificado (naranja)
  "observation",      // 11. Observación (amarillo)
  "preventive",       // 12. Preventivo (verde)
  "healthy",          // 13. Sano (beige)
] as const

export type ColorPriority = typeof COLOR_PRIORITY_ORDER[number]
