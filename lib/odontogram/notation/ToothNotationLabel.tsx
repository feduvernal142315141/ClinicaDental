"use client";

import { cn } from "../utils";

import { toToothLabel } from "./tooth-notation";
import type { PalmerQuadrant, ToothNotation } from "./types";

/**
 * El corchete Palmer dibuja el cuadrante DEL PACIENTE: el cuadrante 1 (superior
 * derecho) cae en la celda superior izquierda de la carta —vista del operador—
 * y su corchete es la esquina inferior-derecha del dígito.
 *
 * Grosor y color son EXPLÍCITOS a propósito. `app/globals.css` aplica
 * `@layer base { * { @apply border-border } }`: todo elemento nace con el gris
 * de separadores, que en tema oscuro deja el corchete casi invisible — y un
 * dígito Palmer sin corchete es ambiguo entre cuatro piezas distintas.
 * Los anchos van por lado (`border-r-[1.5px]`) para que ninguna utilidad de
 * ancho global los pise.
 */
const PALMER_BRACKET_CLASS: Record<PalmerQuadrant, string> = {
  "superior-derecho": "border-r-[1.5px] border-b-[1.5px]",
  "superior-izquierdo": "border-l-[1.5px] border-b-[1.5px]",
  "inferior-derecho": "border-r-[1.5px] border-t-[1.5px]",
  "inferior-izquierdo": "border-l-[1.5px] border-t-[1.5px]",
};

export interface ToothNotationLabelProps {
  /** Número FDI canónico. Es la identidad de la pieza; nunca el texto pintado. */
  fdi: number;
  /** Nomenclatura de la clínica. Llega por prop o contexto, nunca se lee aquí. */
  notation: ToothNotation;
  /** Prefijo para el lector de pantalla: "Diente", "Pieza"… */
  prefix?: string;
  className?: string;
}

/**
 * Pinta una pieza en la notación de la clínica.
 *
 * Los dígitos van `aria-hidden`: en Palmer no dicen qué pieza son sin el
 * corchete, y el corchete es CSS —no se lee. El nombre accesible sale del texto
 * plano, y el `title` conserva siempre el FDI para trazabilidad.
 */
export function ToothNotationLabel({
  fdi,
  notation,
  prefix,
  className,
}: ToothNotationLabelProps) {
  const { digits, quadrant, plain } = toToothLabel(fdi, notation);
  const accessibleLabel = prefix ? `${prefix} ${plain}` : plain;

  return (
    <span
      role="img"
      title={`FDI ${fdi}`}
      aria-label={accessibleLabel}
      className={cn("inline-flex items-center", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "leading-none",
          quadrant && [
            "border-current px-[0.2em] py-[0.15em]",
            PALMER_BRACKET_CLASS[quadrant],
          ],
        )}
      >
        {digits}
      </span>
    </span>
  );
}
