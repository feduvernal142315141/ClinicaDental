import {
  isPermanentFdi,
  isPrimaryFdi,
} from "../domain/odontogram/constants/dentition.constants";
import { ToothTypeService } from "../domain/odontogram/services/ToothTypeService";

import type { PalmerQuadrant, ToothLabelParts, ToothNotation } from "./types";

export const TOOTH_NOTATIONS = ["fdi", "universal", "palmer"] as const;

export const DEFAULT_TOOTH_NOTATION: ToothNotation = "fdi";

export function isToothNotation(value: unknown): value is ToothNotation {
  return (
    typeof value === "string" &&
    (TOOTH_NOTATIONS as readonly string[]).includes(value)
  );
}

export const PALMER_QUADRANT_LABEL: Record<PalmerQuadrant, string> = {
  "superior-derecho": "superior derecho",
  "superior-izquierdo": "superior izquierdo",
  "inferior-izquierdo": "inferior izquierdo",
  "inferior-derecho": "inferior derecho",
};

const PALMER_QUADRANT_BY_FDI: Record<number, PalmerQuadrant> = {
  1: "superior-derecho",
  2: "superior-izquierdo",
  3: "inferior-izquierdo",
  4: "inferior-derecho",
  5: "superior-derecho",
  6: "superior-izquierdo",
  7: "inferior-izquierdo",
  8: "inferior-derecho",
};

// Universal para temporales: letras A-T en el mismo recorrido horario que los
// números 1-32 de los permanentes (A = 55, T = 85). Tabla literal a propósito:
// no hay fórmula que no haya que leer dos veces.
const UNIVERSAL_PRIMARY_LETTER: Record<number, string> = {
  55: "A",
  54: "B",
  53: "C",
  52: "D",
  51: "E",
  61: "F",
  62: "G",
  63: "H",
  64: "I",
  65: "J",
  75: "K",
  74: "L",
  73: "M",
  72: "N",
  71: "O",
  81: "P",
  82: "Q",
  83: "R",
  84: "S",
  85: "T",
};

function quadrantOf(fdi: number): number {
  return ToothTypeService.getQuadrant(fdi);
}

export function positionOf(fdi: number): number {
  return fdi % 10;
}

function toUniversal(quadrant: number, position: number): number {
  switch (quadrant) {
    case 1:
      return 9 - position;
    case 2:
      return 8 + position;
    case 3:
      return 25 - position;
    default:
      return 24 + position;
  }
}

export function toToothLabel(
  fdi: number,
  notation: ToothNotation,
): ToothLabelParts {
  const canonical = String(fdi);

  if (!isPermanentFdi(fdi) && !isPrimaryFdi(fdi)) {
    return { digits: canonical, plain: canonical, fdi: canonical };
  }

  const quadrant = quadrantOf(fdi);
  const position = positionOf(fdi);

  if (notation === "universal") {
    const universal = isPrimaryFdi(fdi)
      ? UNIVERSAL_PRIMARY_LETTER[fdi]
      : String(toUniversal(quadrant, position));
    return { digits: universal, plain: universal, fdi: canonical };
  }

  if (notation === "palmer") {
    const palmerQuadrant = PALMER_QUADRANT_BY_FDI[quadrant];
    // Palmer marca el temporal con letra A-E por posición (1 → A, 5 → E).
    const digits = isPrimaryFdi(fdi)
      ? String.fromCharCode(64 + position)
      : String(position);
    return {
      digits,
      quadrant: palmerQuadrant,
      plain: `${digits} ${PALMER_QUADRANT_LABEL[palmerQuadrant]}`,
      fdi: canonical,
    };
  }

  return { digits: canonical, plain: canonical, fdi: canonical };
}

export function formatToothPlain(fdi: number, notation: ToothNotation): string {
  return toToothLabel(fdi, notation).plain;
}

export function formatToothListPlain(
  fdis: readonly number[],
  notation: ToothNotation,
): string {
  return fdis.map((fdi) => formatToothPlain(fdi, notation)).join(", ");
}

export function describeTeeth(
  fdis: readonly number[],
  notation: ToothNotation,
): string {
  if (fdis.length === 0) return "";
  const noun = fdis.length === 1 ? "Diente" : "Dientes";
  return `${noun} ${formatToothListPlain(fdis, notation)}`;
}
