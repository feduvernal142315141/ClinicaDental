"use client";

import { useState } from "react";
import type { ToothSurface, SurfaceState } from "./types";
import { cn } from "@/lib/odontogram/utils";

interface SurfaceSelectorProps {
  toothNumber: number;
  surfaces: SurfaceState[];
  onSurfaceToggle: (surface: ToothSurface) => void;
  disabled?: boolean;
}

function isAnterior(toothNumber: number): boolean {
  const position = toothNumber % 10;
  return position >= 1 && position <= 3;
}

/** Etiquetas de superficie según posición anterior/posterior */
function getSurfaceLabel(
  surface: ToothSurface,
  anterior: boolean,
): { short: string; full: string } {
  switch (surface) {
    case "mesial":
      return { short: "M", full: "Mesial" };
    case "distal":
      return { short: "D", full: "Distal" };
    case "facial":
      return {
        short: anterior ? "Lab" : "V",
        full: anterior ? "Labial" : "Vestibular",
      };
    case "lingual":
      return {
        short: anterior ? "P" : "L",
        full: anterior ? "Palatino" : "Lingual",
      };
    case "oclusal":
      return {
        short: anterior ? "I" : "O",
        full: anterior ? "Incisal" : "Oclusal",
      };
  }
}

/**
 * Layout de cruz cuadrada:
 *
 *         ┌─────────────┐
 *         │   Facial/V  │
 *    ┌────┼─────────────┼────┐
 *    │ M  │   Oclusal   │  D │
 *    └────┼─────────────┼────┘
 *         │  Lingual/L  │
 *         └─────────────┘
 *
 * Cada zona es un trapezoide SVG clickeable.
 */

/* Geometría del layout cuadrado (viewBox 200x200) */
const OUTER = 200;
const INNER_OFFSET = 50;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
const INNER_SIZE = OUTER - INNER_OFFSET * 2; // 100

const SURFACE_PATHS: Record<ToothSurface, string> = {
  // Facial/Vestibular – trapecio superior
  facial: `M 0 0 L ${OUTER} 0 L ${OUTER - INNER_OFFSET} ${INNER_OFFSET} L ${INNER_OFFSET} ${INNER_OFFSET} Z`,
  // Lingual – trapecio inferior
  lingual: `M ${INNER_OFFSET} ${OUTER - INNER_OFFSET} L ${OUTER - INNER_OFFSET} ${OUTER - INNER_OFFSET} L ${OUTER} ${OUTER} L 0 ${OUTER} Z`,
  // Mesial – trapecio izquierdo
  mesial: `M 0 0 L ${INNER_OFFSET} ${INNER_OFFSET} L ${INNER_OFFSET} ${OUTER - INNER_OFFSET} L 0 ${OUTER} Z`,
  // Distal – trapecio derecho
  distal: `M ${OUTER} 0 L ${OUTER} ${OUTER} L ${OUTER - INNER_OFFSET} ${OUTER - INNER_OFFSET} L ${OUTER - INNER_OFFSET} ${INNER_OFFSET} Z`,
  // Oclusal – cuadrado central
  oclusal: `M ${INNER_OFFSET} ${INNER_OFFSET} L ${OUTER - INNER_OFFSET} ${INNER_OFFSET} L ${OUTER - INNER_OFFSET} ${OUTER - INNER_OFFSET} L ${INNER_OFFSET} ${OUTER - INNER_OFFSET} Z`,
};

/** Posiciones de las etiquetas dentro de cada zona */
const LABEL_POSITIONS: Record<ToothSurface, { x: number; y: number }> = {
  facial: { x: OUTER / 2, y: INNER_OFFSET / 2 + 2 },
  lingual: { x: OUTER / 2, y: OUTER - INNER_OFFSET / 2 + 4 },
  mesial: { x: INNER_OFFSET / 2, y: OUTER / 2 + 4 },
  distal: { x: OUTER - INNER_OFFSET / 2, y: OUTER / 2 + 4 },
  oclusal: { x: OUTER / 2, y: OUTER / 2 + 4 },
};

const SURFACE_ORDER: ToothSurface[] = [
  "facial",
  "lingual",
  "mesial",
  "distal",
  "oclusal",
];

export function SurfaceSelector({
  toothNumber,
  surfaces,
  onSurfaceToggle,
  disabled,
}: SurfaceSelectorProps) {
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(
    null,
  );
  const anterior = isAnterior(toothNumber);

  const isSelected = (surface: ToothSurface): boolean => {
    return surfaces.some((s) => s.surface === surface);
  };

  const getSurfaceColor = (surface: ToothSurface): string => {
    const state = surfaces.find((s) => s.surface === surface);
    return state?.color || "#E5E7EB";
  };

  const handleSurfaceClick = (surface: ToothSurface) => {
    if (!disabled) {
      onSurfaceToggle(surface);
    }
  };

  // Determinar la última superficie interactuada (hover o la última seleccionada)
  const activeSurface =
    hoveredSurface ??
    (surfaces.length > 0 ? surfaces[surfaces.length - 1].surface : null);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      {/* Título */}
      <p className="text-xs text-muted-foreground text-center">
        Haga clic en una sección para seleccionar/deseleccionar la superficie.
      </p>

      {/* SVG con layout de cruz cuadrada */}
      <div className="w-full max-w-55">
        <svg viewBox={`0 0 ${OUTER} ${OUTER}`} className="w-full h-auto">
          {SURFACE_ORDER.map((surface) => {
            const selected = isSelected(surface);
            const hovered = hoveredSurface === surface;
            const label = getSurfaceLabel(surface, anterior);
            const pos = LABEL_POSITIONS[surface];
            const color = getSurfaceColor(surface);

            return (
              <g key={surface}>
                <path
                  d={SURFACE_PATHS[surface]}
                  fill={selected ? color : "#F8FAFC"}
                  stroke={selected ? "#0369A1" : "#CBD5E1"}
                  strokeWidth={selected ? "3" : "2"}
                  className={cn(
                    "transition-all duration-150",
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer",
                    hovered && !disabled && "brightness-95",
                  )}
                  onClick={() => handleSurfaceClick(surface)}
                  onMouseEnter={() => setHoveredSurface(surface)}
                  onMouseLeave={() => setHoveredSurface(null)}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  fontSize="14"
                  fontWeight="bold"
                  fill={selected ? "#0369A1" : "#64748B"}
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{ userSelect: "none" }}
                >
                  {label.short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Indicador de selección estilo pill */}
      <div
        className={cn(
          "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all",
          activeSurface
            ? "bg-sky-100 text-sky-700"
            : "bg-muted text-muted-foreground",
        )}
      >
        {activeSurface
          ? `${isSelected(activeSurface) ? "✓" : ""} ${getSurfaceLabel(activeSurface, anterior).full}`
          : "Esperando selección..."}
      </div>
    </div>
  );
}
