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
};

function quadrantOf(fdi: number): number {
  return ToothTypeService.getQuadrant(fdi);
}

export function positionOf(fdi: number): number {
  return fdi % 10;
}

function isPermanentFdi(fdi: number): boolean {
  if (!Number.isInteger(fdi)) return false;
  const quadrant = quadrantOf(fdi);
  const position = positionOf(fdi);
  return quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
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

  if (!isPermanentFdi(fdi)) {
    return { digits: canonical, plain: canonical, fdi: canonical };
  }

  const quadrant = quadrantOf(fdi);
  const position = positionOf(fdi);

  if (notation === "universal") {
    const universal = String(toUniversal(quadrant, position));
    return { digits: universal, plain: universal, fdi: canonical };
  }

  if (notation === "palmer") {
    const palmerQuadrant = PALMER_QUADRANT_BY_FDI[quadrant];
    const digits = String(position);
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
