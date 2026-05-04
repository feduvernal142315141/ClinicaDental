"use client";

import { useState } from "react";
import type { ToothSurface, SurfaceState } from "./types";
import type { SurfacePath } from "./tooth-square-paths";
import { cn } from "@/lib/odontogram/utils";
import { getDesignedToothPaths } from "./teeth-svg-adapter";

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

/* ---- Tema visual idéntico al odontograma principal ---- */
const THEME = {
  surfaceDefault: "#FFFFFF",
  outlineStroke: "#4A5568",
  rootFill: "#F7FAFC",
  rootStroke: "#718096",
  highlightStroke: "#C4B89A",
} as const;

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

  // Obtener los paths reales del diente para la vista oclusal
  // (la vista oclusal muestra las 5 superficies completas desde arriba)
  const viewPaths = getDesignedToothPaths(toothNumber, "oclusal");

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      {/* Título */}
      <p className="text-xs text-muted-foreground text-center">
        Haga clic en la región anatómica para seleccionar la superficie.
      </p>

      {/* SVG real del diente — reutiliza el mismo sistema del odontograma */}
      <div className="w-full max-w-55 relative group">
        {viewPaths ? (
          <svg
            viewBox={viewPaths.viewBox}
            className="w-full h-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Raíces decorativas */}
            {viewPaths.roots.map((rootD, i) => (
              <path
                key={`root-${i}`}
                d={rootD}
                fill={THEME.rootFill}
                stroke={THEME.rootStroke}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))}

            {/* Superficies clickeables */}
            {viewPaths.surfaces.map((sp: SurfacePath) => {
              if (!sp.d) return null;
              const selected = isSelected(sp.surface as ToothSurface);
              const hovered = hoveredSurface === sp.surface;
              const color = getSurfaceColor(sp.surface as ToothSurface);

              return (
                <path
                  key={sp.surface}
                  d={sp.d}
                  fill={selected ? color : THEME.surfaceDefault}
                  fillOpacity={selected ? 0.85 : 1}
                  stroke={selected ? "#0369A1" : THEME.outlineStroke}
                  strokeWidth={selected ? "1.5" : "0.5"}
                  strokeLinejoin="round"
                  className={cn(
                    "transition-all duration-150",
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:brightness-95",
                    hovered && !disabled && "brightness-90",
                  )}
                  onClick={() => handleSurfaceClick(sp.surface as ToothSurface)}
                  onMouseEnter={() =>
                    setHoveredSurface(sp.surface as ToothSurface)
                  }
                  onMouseLeave={() => setHoveredSurface(null)}
                />
              );
            })}

            {/* Contorno principal */}
            <path
              d={viewPaths.outline}
              fill="none"
              stroke={THEME.outlineStroke}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />

            {/* Líneas de detalle anatómico */}
            {viewPaths.highlights.map((hlD, i) => (
              <path
                key={`hl-${i}`}
                d={hlD}
                fill="none"
                stroke={THEME.highlightStroke}
                strokeWidth="0.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))}
          </svg>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">
            SVG no disponible para este diente
          </p>
        )}

        {/* Leyenda overlay para la superficie hovered */}
        {hoveredSurface && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="bg-white/80 backdrop-blur-sm text-slate-800 font-bold px-2 py-0.5 rounded shadow-sm text-sm">
              {getSurfaceLabel(hoveredSurface, anterior).short} –{" "}
              {getSurfaceLabel(hoveredSurface, anterior).full}
            </span>
          </div>
        )}
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
          ? `${isSelected(activeSurface) ? "✓" : ""} ${
              getSurfaceLabel(activeSurface, anterior).full
            }`
          : "Esperando selección..."}
      </div>
    </div>
  );
}
