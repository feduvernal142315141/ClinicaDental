/**
 * Subruta pública de la nomenclatura dental: `@/lib/odontogram/notation`.
 *
 * Los hosts importan de AQUÍ, nunca de `@/lib/odontogram` — el barril raíz
 * reexporta `OdontogramModule` y arrastraría el módulo entero.
 */
export {
  TOOTH_NOTATIONS,
  DEFAULT_TOOTH_NOTATION,
  PALMER_QUADRANT_LABEL,
  isToothNotation,
  positionOf,
  toToothLabel,
  formatToothNumber,
  formatToothPlain,
  formatToothListPlain,
  describeTeeth,
} from "./tooth-notation";

export { ToothNotationLabel } from "./ToothNotationLabel";
export type { ToothNotationLabelProps } from "./ToothNotationLabel";

export type { ToothNotation, PalmerQuadrant, ToothLabelParts } from "./types";
