"use client";

import dynamic from "next/dynamic";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type { ToothSurface } from "./types";
import { useEffect, useMemo, useState } from "react";
import { ToothSymbolService } from "@/lib/odontogram/domain/odontogram/services/ToothSymbolService";
import type { ToothViewPaths, SurfacePath } from "./tooth-square-paths";
import { getDesignedToothPaths } from "./teeth-svg-adapter";

interface ToothSVGMultiViewProps {
  toothNumber: number;
  view: "frontal" | "oclusal" | "lateral";
  surfaceTreatments?: unknown[];
  surfaceConditions?: unknown[];
  onSurfaceClick: (surface: ToothSurface) => void;
}

/* ---- Colores del tema – diseño profesional ---- */
const THEME = {
  /** Color base de superficie sin tratamiento */
  surfaceDefault: "#FFFFFF",
  /** Stroke del contorno principal */
  outlineStroke: "#4A5568",
  /** Fill de las raíces */
  rootFill: "#F7FAFC",
  /** Stroke de las raíces */
  rootStroke: "#718096",
  /** Stroke de líneas de detalle */
  highlightStroke: "#C4B89A",
  /** Fill hover feedback */
  hoverOpacity: 0.85,
} as const;

function _ToothSVGMultiView({
  toothNumber,
  view,
  onSurfaceClick,
}: ToothSVGMultiViewProps) {
  const isClient = typeof window !== "undefined";

    // eslint-disable-next-line react-hooks/exhaustive-deps
  const clinicalEvents = isClient
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useOdontogramStore((state) => state.clinicalEvents)
    : [];
  const getSurfaceColor = isClient
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useOdontogramStore((state) => state.getSurfaceColor)
    : () => "transparent";

    // eslint-disable-next-line react-hooks/rules-of-hooks
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toothNumber, getSurfaceColor, clinicalEvents]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
  const toothSymbol = useMemo(() => {
    if (!isClient) return null;
    return ToothSymbolService.getToothSymbol(toothNumber, clinicalEvents);
  }, [toothNumber, clinicalEvents, isClient]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toothSymbolImage = useMemo(() => {
    if (!isClient) return null;
    return ToothSymbolService.getToothSymbolImage(toothNumber, clinicalEvents);
  }, [toothNumber, clinicalEvents, isClient]);

  // Use the professionally designed SVG paths
  const viewPaths = getDesignedToothPaths(toothNumber, view);

  if (!viewPaths) return null;

  return (
    <DesignedToothView
      viewPaths={viewPaths}
      surfaceColors={surfaceColors}
      symbol={toothSymbol}
      symbolImage={toothSymbolImage}
      onSurfaceClick={onSurfaceClick}
      view={view}
    />
  );
}

/* ---------- Componente de renderizado para las piezas diseñadas ---------- */
function DesignedToothView({
  viewPaths,
  surfaceColors,
  symbol,
  symbolImage,
  onSurfaceClick,
  view,
}: {
  viewPaths: ToothViewPaths;
  surfaceColors: Record<ToothSurface, string>;
  symbol: string | null;
  symbolImage?: string | null;
  onSurfaceClick: (surface: ToothSurface) => void;
  view: "frontal" | "oclusal" | "lateral";
}) {
  const { viewBox, outline, surfaces, roots, highlights } = viewPaths;

  // Calcular centro del viewBox para posicionar el símbolo
  const vbParts = viewBox.split(" ").map(Number);
  const cx = vbParts[0] + vbParts[2] / 2;
  const cy = vbParts[1] + vbParts[3] / 2;
  // Scale font size relative to viewBox width
  const fontSize = Math.round(vbParts[2] * 0.22);

  // Si la imagen del símbolo falla (URL rota/404), se cae al texto/heurística.
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [symbolImage]);
  const showImage = !!symbolImage && !imgError;

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Raíces (debajo de la corona, siempre visibles en vestibular) */}
      {roots.map((rootD, i) => (
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

      {/* Superficies clickeables (zonas del diseño) */}
      {surfaces.map((sp: SurfacePath) => {
        if (!sp.d) return null; // Skip empty paths (non-visible surface)
        const color = surfaceColors[sp.surface];
        const hasTreatment = color !== "transparent";
        return (
          <path
            key={sp.surface}
            d={sp.d}
            fill={hasTreatment ? color : THEME.surfaceDefault}
            fillOpacity={hasTreatment ? 0.75 : 1}
            stroke={THEME.outlineStroke}
            strokeWidth="0.5"
            strokeLinejoin="round"
            strokeOpacity="0.3"
            className="cursor-pointer transition-all duration-150 hover:brightness-105 hover:fill-opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(sp.surface);
            }}
          />
        );
      })}

      {/* Contorno principal (encima, solo stroke – el diseño profesional) */}
      <path
        d={outline}
        fill="none"
        stroke={THEME.outlineStroke}
        strokeWidth="1"
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

      {/* Símbolo del servicio en modo imagen (precede al texto). */}
      {showImage && view === "oclusal" && (
        <image
          href={symbolImage as string}
          x={cx - fontSize * 0.8}
          y={cy - fontSize * 0.8}
          width={fontSize * 1.6}
          height={fontSize * 1.6}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
          onError={() => setImgError(true)}
        />
      )}

      {/* Símbolo profesional (texto: letra de tratamiento o texto del servicio) */}
      {!showImage && symbol && view === "oclusal" && (
        <text
          x={cx}
          y={cy + fontSize * 0.35}
          fontSize={fontSize}
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
