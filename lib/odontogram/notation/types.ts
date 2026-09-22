export type ToothNotation = "fdi" | "universal" | "palmer";

export type PalmerQuadrant =
  | "superior-derecho"
  | "superior-izquierdo"
  | "inferior-izquierdo"
  | "inferior-derecho";

export interface ToothLabelParts {
  digits: string;
  quadrant?: PalmerQuadrant;
  plain: string;
  fdi: string;
}
