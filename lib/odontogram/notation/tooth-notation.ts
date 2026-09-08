/**
 * Núcleo de conversión de nomenclatura dental. PURO: sin React, sin red, sin
 * estado. Convierte un FDI (identidad) en texto (pintura) y nada más.
 *
 * Único formateador de piezas del repositorio: si aparece una segunda forma de
 * convertir un FDI en texto, esa es la que sobra.
 */
import { ToothTypeService } from "../domain/odontogram/services/ToothTypeService";

import type { PalmerQuadrant, ToothLabelParts, ToothNotation } from "./types";

/** Las tres nomenclaturas soportadas, en orden de presentación. */
export const TOOTH_NOTATIONS = ["fdi", "universal", "palmer"] as const;

/** FDI/ISO 3950: estándar internacional (OMS, Latinoamérica, Europa). */
export const DEFAULT_TOOTH_NOTATION: ToothNotation = "fdi";

/** Guarda de tipo para valores que llegan de la API o de la configuración. */
export function isToothNotation(value: unknown): value is ToothNotation {
  return (
    typeof value === "string" &&
    (TOOTH_NOTATIONS as readonly string[]).includes(value)
  );
}

/**
 * MAPA CANÓNICO cuadrante → nombre en español para TODO el repositorio.
 * Antes estaba escrito dos veces (`surfaces-tab.tsx` y `tooth-modal.tsx`), que
 * ahora lo consumen de aquí; esta es la única copia que debe quedar. No cuenta
 * `ToothTypeService`: su prosa es de ARCADA (palatino/lingual), otro eje.
 * En minúsculas porque se usa dentro de frase; capitalizar es cosa de la vista.
 */
export const PALMER_QUADRANT_LABEL: Record<PalmerQuadrant, string> = {
  "superior-derecho": "superior derecho",
  "superior-izquierdo": "superior izquierdo",
  "inferior-izquierdo": "inferior izquierdo",
  "inferior-derecho": "inferior derecho",
};

/** Cuadrante FDI (1-4) → cuadrante nombrado del paciente. */
const PALMER_QUADRANT_BY_FDI: Record<number, PalmerQuadrant> = {
  1: "superior-derecho",
  2: "superior-izquierdo",
  3: "inferior-izquierdo",
  4: "inferior-derecho",
};

/**
 * Cuadrante FDI (1-4) de una pieza. Delega en `ToothTypeService.getQuadrant`,
 * que ya es la fuente de verdad de la arcada (y de ahí palatino vs lingual).
 */
function quadrantOf(fdi: number): number {
  return ToothTypeService.getQuadrant(fdi);
}

/** Posición dentro del cuadrante (1 = central … 8 = tercer molar). */
export function positionOf(fdi: number): number {
  return fdi % 10;
}

/** Solo dentición permanente: 11-18, 21-28, 31-38, 41-48. */
function isPermanentFdi(fdi: number): boolean {
  if (!Number.isInteger(fdi)) return false;
  const quadrant = quadrantOf(fdi);
  const position = positionOf(fdi);
  return quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
}

/**
 * Universal/ADA por cuadrante FDI con posición `n` (1-8):
 * Q1 `9−n` · Q2 `8+n` · Q3 `25−n` · Q4 `24+n`.
 * Comprobado en los ocho extremos: 18→1, 11→8, 21→9, 28→16, 38→17, 31→24,
 * 41→25, 48→32.
 */
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

/**
 * Traduce un FDI a las partes de su etiqueta en la notación pedida.
 *
 * FUERA DE RANGO NO LANZA: una pieza temporal (51-85) o un número corrupto
 * vuelve tal cual en los tres campos de texto, sin cuadrante. La dentición
 * temporal no está implementada porque la tienda solo enumera las 32
 * permanentes; esto únicamente garantiza que el formateador no rompa la vista.
 */
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

/** Forma COMPACTA (dígitos). En Palmer es ambigua sin su corchete. */
export function formatToothNumber(fdi: number, notation: ToothNotation): string {
  return toToothLabel(fdi, notation).digits;
}

/** Forma INEQUÍVOCA. Para aria-labels, prosa, toasts, impresión y PDF. */
export function formatToothPlain(fdi: number, notation: ToothNotation): string {
  return toToothLabel(fdi, notation).plain;
}

/**
 * Lista compacta. Solo sirve donde cada dígito viaja con su corchete al lado;
 * en cualquier prosa usa `formatToothListPlain`.
 */

/**
 * Lista en prosa. Obligatoria fuera del glifo: en Palmer, 16/26/36 se
 * imprimirían como "6, 6, 6" — irresoluble en un presupuesto que se firma.
 */
export function formatToothListPlain(
  fdis: readonly number[],
  notation: ToothNotation,
): string {
  return fdis.map((fdi) => formatToothPlain(fdi, notation)).join(", ");
}

/** "Diente 16" · "Dientes 16, 17". Siempre en forma plain. */
export function describeTeeth(
  fdis: readonly number[],
  notation: ToothNotation,
): string {
  if (fdis.length === 0) return "";
  const noun = fdis.length === 1 ? "Diente" : "Dientes";
  return `${noun} ${formatToothListPlain(fdis, notation)}`;
}
