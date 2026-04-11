// TEMPORAL: Prueba de pieza 18 con SVG preliminar de public/DIENTES.svg
// Eliminar este archivo tras la validación del equipo.
"use client";

import type { ToothSurface } from "./types";

/* ---- Colores del tema (copiados de tooth-svg-multi-view) ---- */
const THEME = {
  surfaceDefault: "#F5F0E8",
  outlineStroke: "#8B7E6A",
  rootFill: "#ededed",
  rootStroke: "#000",
} as const;

/* ================================================================
 *  Paths extraídos de public/DIENTES.svg — pieza 18
 *  Se usan coordenadas originales; el viewBox recorta la zona.
 * ================================================================ */

/* -- Vista frontal (grupo V18) --------------------------------- */
const V18_VIEWBOX = "89 108 44 90";

/** Raíz de la pieza 18 (class="st2" en el SVG original) */
const V18_ROOT_D =
  "M96.54,168.44c2.74-.14,5.55-.81,8.07-1.86,1.13-.48,2.17-1.06,3.2-1.73,2.62-1.72,5.38-2.05,8.38-.7,1.45.65,3.03,1.07,4.66,1.36.73.13,1.53.19,2.33.17.37,0,.74.03,1.1.08l.35-.27c.07-6.09-4.92-26.59-6.98-31.29-.77-1.76-2.42-7.5-3.04-9.87-.96-3.69-2.45-8.24-2.69-9.27-1.24-5.41-4.45-4.81-4.23-.07.35,7.67,6.6,23.9,5.96,26.57-1.11-3.97-10.08-25.03-11.6-28.95-.44-1.14-1.16-2.11-2.38-2.86-1.08-.66-1.92-.45-2.49.57-.41.73-.59,1.5-.64,2.3-.43,6.14.82,11.88-.02,18-.84,6.1,1.01,31.73.02,37.82h0Z";

/** Línea de detalle de la raíz (class="st1") */
const V18_ROOT_DETAIL_D = "M113.64,141.56c-.39,1.63,2.24,12.41,2.62,14.01";

/** Contorno corona+raíz (class="st1" en el SVG original) */
const V18_OUTLINE_D =
  "M91.73,172.67c.53-2.34,2.47-4.11,4.81-4.23,2.74-.14,5.55-.81,8.07-1.86,1.13-.48,2.17-1.06,3.2-1.73,2.62-1.72,5.38-2.05,8.38-.7,1.45.65,3.03,1.07,4.66,1.36.73.13,1.53.19,2.33.17,2.43-.06,4.67,1.32,5.57,3.64.57,1.49,1.02,3,1.25,4.55.76,5.19.75,10.41-1.59,15.38-.81,1.71-1.97,3.17-3.38,4.42-1.73,1.53-3.89,1.71-6,.93-1.92-.7-5.68,1.12-8.58.78-1.07-.12-3.33-2.46-5.5-2.05-3.78.71-6.94-1.4-9.59-4.07-1.62-1.64-2.29-3.68-3.07-5.68-.18-.47-.48-1.24-.62-1.73-.59-2.07-.74-4.23-.44-6.36.04-.31.08-.6.12-.84.1-.67.23-1.33.38-1.98h0Z";

const V18_SURFACES: { surface: ToothSurface; d: string }[] = [
  {
    surface: "mesial",
    d: "M104.6,166.57c-2.52,1.06-5.32,1.72-8.07,1.86-2.33.12-4.28,1.9-4.81,4.23-.15.66-.27,1.32-.38,1.98-.04.24-.08.52-.12.84-.13.91-.15,1.82-.12,2.73h20.67v-14.87c-1.37.14-2.7.65-3.99,1.49-1.02.67-2.06,1.25-3.2,1.73h.02Z",
  },
  {
    surface: "distal",
    d: "M130.4,178.22c-.06-1.45-.2-2.9-.41-4.34-.23-1.55-.68-3.07-1.25-4.55-.89-2.32-3.14-3.7-5.57-3.64-.8.02-1.6-.04-2.33-.17-1.63-.29-3.21-.71-4.66-1.36-1.52-.69-2.98-.94-4.4-.8v14.87h18.62Z",
  },
  {
    surface: "facial",
    d: "M91.11,178.22c.05,1.23.22,2.45.56,3.63.14.49.44,1.26.62,1.73.78,2,1.44,4.04,3.07,5.68,2.64,2.67,5.81,4.78,9.59,4.07,2.16-.41,4.43,1.93,5.5,2.05.43.05.88.05,1.34.02v-17.18h-20.68Z",
  },
  {
    surface: "oclusal",
    d: "M111.79,195.4c2.64-.17,5.61-1.4,7.24-.8,2.1.77,4.27.59,6-.93,1.41-1.25,2.58-2.71,3.38-4.42,1.69-3.58,2.15-7.3,2-11.04h-18.62v17.18h0Z",
  },
];

/* -- Vista oclusal (grupos O18-01 a O18-04) -------------------- */
const O18_VIEWBOX = "87 201 45 41";
/** Centro aproximado donde convergen los 4 cuadrantes */
const O18_CX = 109;
const O18_CY = 221.3;

/** Contorno oclusal completo (class="st1" en el SVG original) */
const O18_OUTLINE_D =
  "M106.48,239.29c4.23-.47,7.79-.53,12.05-1.15,4.56-.66,7.12-3.47,8.12-7.52,1.65-6.67,2.17-13.35,1.22-20.14-.6-4.34-6.82-8.84-12.07-7.11-3.63,1.19-7.47,1.36-11.26.59-4.35-.89-7.43.89-10.07,3.93-3.05,3.52-4.49,6.49-4.47,10.67.02,4.7-.08,7.82,1.08,12.37,1.26,4.94,4.87,8.25,10.48,8.85,1,.11,3.92-.31,4.92-.49";

/** Líneas de detalle oclusal (class="st1" en el SVG original) */
const O18_HIGHLIGHTS: string[] = [
  "M109.1,222.49c.47-1.93,1.2-3.8,1.52-5.76.41-2.53.48-5.08.29-7.63",
  "M110.36,233.55c2.06-3.11,2.65-6.58,2.86-10.14",
  "M94.32,227.46c.43-2.05.25-4.08-.11-6.12",
  "M94.92,224.58c4.64.72,9.06.13,13.34-1.64,1.27-.52,2.63.15,3.97.16,3.42.02,6.73-.29,9.85-1.67",
];

const O18_SURFACES: { surface: ToothSurface; d: string }[] = [
  {
    surface: "mesial",
    d: "M103.88,203.96c-4.35-.89-7.43.89-10.07,3.93-3.05,3.52-4.49,6.49-4.47,10.67v2.77h19.16v-16.92c-1.54,0-3.09-.15-4.63-.46h0Z",
  },
  {
    surface: "facial",
    d: "M127.5,221.34c.29-3.6.21-7.21-.29-10.86-.6-4.34-6.82-8.84-12.07-7.11-2.15.71-4.38,1.05-6.63,1.05v16.92h19-.01Z",
  },
  {
    surface: "lingual",
    d: "M90.02,221.34c.02,3.29.15,6,1.07,9.6,1.26,4.94,4.87,8.25,10.48,8.85,1,.11,3.92-.31,4.92-.49.93-.1,1.82-.19,2.7-.26v-17.7h-19.17Z",
  },
  {
    surface: "distal",
    d: "M109.18,239.03c3.12-.26,6.03-.4,9.36-.89,4.56-.66,7.12-3.47,8.12-7.52.76-3.09,1.27-6.18,1.52-9.29h-19s0,17.7,0,17.7Z",
  },
];

/* ================================================================
 *  Props compartidas por ambas vistas
 * ================================================================ */
interface Tooth18ViewProps {
  surfaceColors: Record<ToothSurface, string>;
  onSurfaceClick: (surface: ToothSurface) => void;
  symbol: string | null;
}

/* ---- Componente auxiliar: path de superficie clickeable ---- */
function SurfacePath({
  d,
  surface,
  color,
  onClick,
}: {
  d: string;
  surface: ToothSurface;
  color: string;
  onClick: (surface: ToothSurface) => void;
}) {
  const hasTreatment = color !== "transparent";
  return (
    <path
      d={d}
      fill={hasTreatment ? color : THEME.surfaceDefault}
      fillOpacity={hasTreatment ? 0.85 : 1}
      stroke={THEME.outlineStroke}
      strokeWidth="0.8"
      strokeLinejoin="round"
      className="cursor-pointer transition-all duration-150 hover:brightness-110 hover:opacity-90"
      onClick={(e) => {
        e.stopPropagation();
        onClick(surface);
      }}
    />
  );
}

/* ================================================================
 *  Tooth18FrontalView
 * ================================================================ */
export function Tooth18FrontalView({
  surfaceColors,
  onSurfaceClick,
}: Tooth18ViewProps) {
  return (
    <svg
      viewBox={V18_VIEWBOX}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Raíz (debajo de la corona) */}
      <path
        d={V18_ROOT_D}
        fill={THEME.rootFill}
        stroke={THEME.rootStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />

      {/* Superficies clickeables */}
      {V18_SURFACES.map((sp) => (
        <SurfacePath
          key={sp.surface}
          d={sp.d}
          surface={sp.surface}
          color={surfaceColors[sp.surface]}
          onClick={onSurfaceClick}
        />
      ))}

      {/* Contorno corona (encima, solo stroke) */}
      <path
        d={V18_OUTLINE_D}
        fill="none"
        stroke={THEME.rootStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />

      {/* Detalle de raíz */}
      <path
        d={V18_ROOT_DETAIL_D}
        fill="none"
        stroke={THEME.rootStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </svg>
  );
}

/* ================================================================
 *  Tooth18OclusalView
 * ================================================================ */
export function Tooth18OclusalView({
  surfaceColors,
  onSurfaceClick,
  symbol,
}: Tooth18ViewProps) {
  const oclusalColor = surfaceColors.oclusal;
  const hasOclusal = oclusalColor !== "transparent";

  return (
    <svg
      viewBox={O18_VIEWBOX}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 4 cuadrantes del SVG preliminar */}
      {O18_SURFACES.map((sp) => (
        <SurfacePath
          key={sp.surface}
          d={sp.d}
          surface={sp.surface}
          color={surfaceColors[sp.surface]}
          onClick={onSurfaceClick}
        />
      ))}

      {/* Overlay central → superficie "oclusal" (5.ª zona) */}
      <ellipse
        cx={O18_CX}
        cy={O18_CY}
        rx={5}
        ry={4.5}
        fill={hasOclusal ? oclusalColor : "transparent"}
        fillOpacity={hasOclusal ? 0.85 : 0}
        stroke={hasOclusal ? THEME.outlineStroke : "none"}
        strokeWidth="0.6"
        className="cursor-pointer transition-all duration-150 hover:brightness-110 hover:opacity-90"
        style={{ pointerEvents: "all" }}
        onClick={(e) => {
          e.stopPropagation();
          onSurfaceClick("oclusal");
        }}
      />

      {/* Contorno oclusal (encima, solo stroke) */}
      <path
        d={O18_OUTLINE_D}
        fill="none"
        stroke={THEME.rootStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />

      {/* Líneas de detalle oclusal */}
      {O18_HIGHLIGHTS.map((hlD, i) => (
        <path
          key={`hl-${i}`}
          d={hlD}
          fill="none"
          stroke={THEME.outlineStroke}
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      ))}

      {/* Símbolo profesional */}
      {symbol && (
        <text
          x={O18_CX}
          y={O18_CY + 3}
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
