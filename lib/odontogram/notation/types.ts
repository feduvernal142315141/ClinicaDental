/**
 * Contratos de la nomenclatura dental.
 *
 * El dato guardado NUNCA cambia: FDI/ISO 3950 es la forma canónica en la base
 * de datos, en el snapshot y en la API. La notación es presentación, y solo eso.
 */

/** Nomenclatura elegida por la clínica. FDI es el defecto. */
export type ToothNotation = "fdi" | "universal" | "palmer";

/**
 * Cuadrante DEL PACIENTE (no la esquina del dígito: la esquina del corchete
 * Palmer es la opuesta en vertical). Se nombra así a propósito para evitar la
 * inversión que pintaría la pieza equivocada.
 */
export type PalmerQuadrant =
  | "superior-derecho"
  | "superior-izquierdo"
  | "inferior-izquierdo"
  | "inferior-derecho";

/** Las partes de una pieza ya traducidas a la notación pedida. */
export interface ToothLabelParts {
  /** Dígitos a pintar: "16" · "3" · "6". Compacto, puede ser ambiguo en Palmer. */
  digits: string;
  /** Solo en Palmer: el cuadrante que dibuja el corchete. */
  quadrant?: PalmerQuadrant;
  /** Texto INEQUÍVOCO para aria, prosa, toasts e impresión: "6 superior derecho". */
  plain: string;
  /** FDI canónico SIEMPRE, para title/tooltip y trazabilidad. */
  fdi: string;
}
