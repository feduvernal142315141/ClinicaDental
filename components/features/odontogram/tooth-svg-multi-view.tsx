"use client";

import dynamic from "next/dynamic";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type { ToothSurface } from "./types";
import { useMemo } from "react";
import { getToothType } from "./tooth-svg-definitions";
import { ToothSymbolService } from "@/lib/odontogram/domain/odontogram/services/ToothSymbolService";
import { toothSquarePaths } from "./tooth-square-paths";
import type { ToothViewPaths, SurfacePath } from "./tooth-square-paths";
// TEMPORAL: Prueba pieza 18 con SVG preliminar — eliminar tras validación
import { Tooth18FrontalView, Tooth18OclusalView } from "./tooth-18-preview";

interface ToothSVGMultiViewProps {
  toothNumber: number;
  view: "frontal" | "oclusal" | "lateral";
  surfaceTreatments?: any[];
  surfaceConditions?: any[];
  onSurfaceClick: (surface: ToothSurface) => void;
}

/* ---- Colores del tema lineal ---- */
const THEME = {
  /** Color base de superficie sin tratamiento */
  surfaceDefault: "#F5F0E8",
  /** Stroke del contorno principal */
  outlineStroke: "#8B7E6A",
  /** Fill de las raíces */
  rootFill: "#E8DCC8",
  /** Stroke de las raíces */
  rootStroke: "#B8A889",
  /** Stroke de líneas de detalle */
  highlightStroke: "#C4B89A",
} as const;

function _ToothSVGMultiView({
  toothNumber,
  view,
  onSurfaceClick,
}: ToothSVGMultiViewProps) {
  const isClient = typeof window !== "undefined";

  const clinicalEvents = isClient
    ? useOdontogramStore((state) => state.clinicalEvents)
    : [];
  const getSurfaceColor = isClient
    ? useOdontogramStore((state) => state.getSurfaceColor)
    : () => "transparent";

  const surfaceColors = useMemo(() => {
    const surfaces: ToothSurface[] = [
      "oclusal",
      "facial",
      "lingual",
      "mesial",
      "distal",
    ];
    return surfaces.reduce(
      (acc, surface) => {
        acc[surface] = getSurfaceColor(toothNumber, surface);
        return acc;
      },
      {} as Record<ToothSurface, string>,
    );
  }, [toothNumber, getSurfaceColor, clinicalEvents]);

  const toothSymbol = useMemo(() => {
    if (!isClient) return null;
    return ToothSymbolService.getToothSymbol(toothNumber, clinicalEvents);
  }, [toothNumber, clinicalEvents, isClient]);

  // TEMPORAL: Pieza 18 usa SVG preliminar para vistas frontal y oclusal
  if (toothNumber === 18 && view === "frontal") {
    return (
      <Tooth18FrontalView
        surfaceColors={surfaceColors}
        onSurfaceClick={onSurfaceClick}
        symbol={toothSymbol}
      />
    );
  }
  if (toothNumber === 18 && view === "oclusal") {
    return (
      <Tooth18OclusalView
        surfaceColors={surfaceColors}
        onSurfaceClick={onSurfaceClick}
        symbol={toothSymbol}
      />
    );
  }

  const toothType = getToothType(toothNumber);
  const paths = toothSquarePaths[toothType];
  if (!paths) return null;

  const viewPaths: ToothViewPaths = paths[view];

  return (
    <ToothView
      viewPaths={viewPaths}
      surfaceColors={surfaceColors}
      symbol={toothSymbol}
      onSurfaceClick={onSurfaceClick}
      view={view}
    />
  );
}

/* ---------- Componente genérico de renderizado para cualquier vista ---------- */
function ToothView({
  viewPaths,
  surfaceColors,
  symbol,
  onSurfaceClick,
  view,
}: {
  viewPaths: ToothViewPaths;
  surfaceColors: Record<ToothSurface, string>;
  symbol: string | null;
  onSurfaceClick: (surface: ToothSurface) => void;
  view: "frontal" | "oclusal" | "lateral";
}) {
  const { viewBox, outline, surfaces, roots, highlights } = viewPaths;

  // Calcular centro del viewBox para posicionar el símbolo
  const vbParts = viewBox.split(" ").map(Number);
  const cx = vbParts[2] / 2;
  const cy = vbParts[3] / 2;

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Raíces (debajo de la corona) */}
      {roots.map((rootD, i) => (
        <path
          key={`root-${i}`}
          d={rootD}
          fill={THEME.rootFill}
          stroke={THEME.rootStroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Superficies clickeables (5 zonas) */}
      {surfaces.map((sp: SurfacePath) => {
        const color = surfaceColors[sp.surface];
        const hasTreatment = color !== "transparent";
        return (
          <path
            key={sp.surface}
            d={sp.d}
            fill={hasTreatment ? color : THEME.surfaceDefault}
            fillOpacity={hasTreatment ? 0.85 : 1}
            stroke={THEME.outlineStroke}
            strokeWidth="0.8"
            strokeLinejoin="round"
            className="cursor-pointer transition-all duration-150 hover:brightness-110 hover:opacity-90"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(sp.surface);
            }}
          />
        );
      })}

      {/* Contorno principal (encima, solo stroke) */}
      <path
        d={outline}
        fill="none"
        stroke={THEME.outlineStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />

      {/* Líneas de detalle anatómico */}
      {highlights.map((hlD, i) => (
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

      {/* Símbolo profesional (letra indicando tipo de tratamiento) */}
      {symbol && view === "oclusal" && (
        <text
          x={cx}
          y={cy + 3}
          fontSize="10"
          fontWeight="700"
          textAnchor="middle"
          fill="#1F2937"
          stroke="#FFFFFF"
          strokeWidth="0.5"
          pointerEvents="none"
          style={{ userSelect: "none" }}
        >
          {symbol}
        </text>
      )}
    </svg>
  );
}

/* ✅ Export nombrado con SSR desactivado */
export const ToothSVGMultiView = dynamic(
  () => Promise.resolve(_ToothSVGMultiView),
  { ssr: false },
);
