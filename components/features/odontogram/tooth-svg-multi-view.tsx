"use client";

import dynamic from "next/dynamic";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type { ToothSurface } from "./types";
import { useEffect, useMemo, useState } from "react";
import { ToothSymbolService } from "@/lib/odontogram/domain/odontogram/services/ToothSymbolService";
import { OdontogramColorService } from "@/lib/odontogram/domain/odontogram/services/OdontogramColorService";
import type { ToothViewPaths, SurfacePath } from "./teeth-svg-types";
import { getDesignedToothPaths } from "./teeth-svg-adapter";

interface ToothSVGMultiViewProps {
  toothNumber: number;
  view: "frontal" | "oclusal" | "lateral";
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
      "cervicalVestibular",
      "cervicalLingual",
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
  const toothSymbolInfo = useMemo(() => {
    if (!isClient) return null;
    return ToothSymbolService.getToothSymbolInfo(toothNumber, clinicalEvents);
  }, [toothNumber, clinicalEvents, isClient]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toothSymbolImage = useMemo(() => {
    if (!isClient) return null;
    return ToothSymbolService.getToothSymbolImage(toothNumber, clinicalEvents);
  }, [toothNumber, clinicalEvents, isClient]);

  // Color base de la pieza completa (ausente/implante/corona/endo): se aplica a
  // todas las caras en las 3 vistas. Las caries por superficie tienen precedencia.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toothLevelColor = useMemo(() => {
    if (!isClient) return null;
    return OdontogramColorService.getToothLevelColor(
      toothNumber,
      clinicalEvents,
    );
  }, [toothNumber, clinicalEvents, isClient]);

  // Use the professionally designed SVG paths
  const viewPaths = getDesignedToothPaths(toothNumber, view);

  if (!viewPaths) return null;

  return (
    <DesignedToothView
      viewPaths={viewPaths}
      surfaceColors={surfaceColors}
      toothLevelColor={toothLevelColor}
      symbol={toothSymbolInfo?.text ?? null}
      symbolKey={toothSymbolInfo?.symbolKey ?? null}
      symbolColor={toothSymbolInfo?.symbolColor ?? null}
      symbolImage={toothSymbolImage}
      onSurfaceClick={onSurfaceClick}
    />
  );
}

/** Neutro por defecto para símbolos sin symbolColor declarado (ink). */
const DEFAULT_SYMBOL_COLOR = "#1F2937";

/* ---------- Componente de renderizado para las piezas diseñadas ---------- */
function DesignedToothView({
  viewPaths,
  surfaceColors,
  toothLevelColor,
  symbol,
  symbolKey,
  symbolColor,
  symbolImage,
  onSurfaceClick,
}: {
  viewPaths: ToothViewPaths;
  surfaceColors: Record<ToothSurface, string>;
  toothLevelColor?: string | null;
  symbol: string | null;
  symbolKey?: string | null;
  symbolColor?: string | null;
  symbolImage?: string | null;
  onSurfaceClick: (surface: ToothSurface) => void;
}) {
  const {
    viewBox,
    outline,
    surfaces,
    roots,
    highlights,
    symbolAnchor,
    transform,
  } = viewPaths;

  // Posición del símbolo: centro de la CORONA (symbolAnchor), no del viewBox
  // completo — así no cae sobre la raíz en la vista vestibular.
  const vbParts = viewBox.split(" ").map(Number);
  const cx = symbolAnchor?.x ?? vbParts[0] + vbParts[2] / 2;
  const cy = symbolAnchor?.y ?? vbParts[1] + vbParts[3] / 2;
  // Y del símbolo: en la vista lateral la geometría se voltea verticalmente
  // (transform). El símbolo se dibuja FUERA del grupo volteado para no espejar
  // el glifo, así que su ancla se refleja a mano sobre el eje del viewBox para
  // que caiga en la corona ya volteada. En frontal/oclusal (sin transform) usa cy.
  const reflectY = (y: number) =>
    transform ? 2 * vbParts[1] + vbParts[3] - y : y;
  const symbolY = reflectY(cy);
  // Scale font size relative to viewBox width
  const fontSize = Math.round(vbParts[2] * 0.22);
  // Color del símbolo (canal independiente del relleno). Neutro por defecto.
  const symColor = symbolColor || DEFAULT_SYMBOL_COLOR;

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
      {/* Grupo de geometría: en la vista lateral se voltea verticalmente
          (transform). Pintura y zonas clicables (onClick) se voltean juntas, así
          el hit-testing queda alineado. El símbolo NO va aquí — se dibuja fuera
          y upright. En frontal/oclusal transform === undefined → sin cambios. */}
      <g transform={transform ?? undefined}>
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
        const surfaceColor = surfaceColors[sp.surface];
        const hasSurfaceTreatment = surfaceColor !== "transparent";
        // Precedencia: color por superficie (caries) > color a nivel diente
        // (ausente/implante/corona/endo) > color natural del diente.
        const fill = hasSurfaceTreatment
          ? surfaceColor
          : (toothLevelColor ?? THEME.surfaceDefault);
        const fillOpacity = hasSurfaceTreatment
          ? 0.75
          : toothLevelColor
            ? 0.6
            : 1;
        return (
          <path
            key={sp.surface}
            d={sp.d}
            fill={fill}
            fillOpacity={fillOpacity}
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
      </g>

      {/* Símbolo del servicio en modo imagen (precede al texto). Se dibuja en
          las 3 vistas para que estados de pieza y tratamientos realizados sean
          visibles también en Frontal y Lateral, no solo en Oclusal. */}
      {showImage && (
        <image
          href={symbolImage as string}
          x={cx - fontSize * 0.8}
          y={symbolY - fontSize * 0.8}
          width={fontSize * 1.6}
          height={fontSize * 1.6}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
          onError={() => setImgError(true)}
        />
      )}

      {/* CRUZ de ausencia (symbolKey 'cross'): aspa vectorial centrada en la
          corona, color symbolColor (azul pendiente / rojo hecho). Doble trazo:
          halo blanco debajo + aspa de color encima, para legibilidad sobre
          cualquier relleno. NO texto. */}
      {!showImage && symbolKey === "cross" && (
        (() => {
          const arm = fontSize * 0.55;
          const sw = Math.max(1.2, fontSize * 0.16);
          const x1 = cx - arm;
          const x2 = cx + arm;
          const y1 = symbolY - arm;
          const y2 = symbolY + arm;
          return (
            <g pointerEvents="none">
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={sw + 1.4} strokeLinecap="round" />
              <line x1={x1} y1={y2} x2={x2} y2={y1} stroke="#FFFFFF" strokeWidth={sw + 1.4} strokeLinecap="round" />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={symColor} strokeWidth={sw} strokeLinecap="round" />
              <line x1={x1} y1={y2} x2={x2} y2={y1} stroke={symColor} strokeWidth={sw} strokeLinecap="round" />
            </g>
          );
        })()
      )}

      {/* ANILLO de corona (symbolKey 'crown_ring'): círculo/óvalo que RODEA la
          pieza (convención odontológica), sin relleno. NO traza la silueta del
          diente: es un aro centrado en la corona, color del símbolo (rojo = por
          hacer / azul = realizada) con halo blanco debajo. La elipse es simétrica
          en Y → no necesita el volteo del grupo lateral (symbolY ya está
          reflejado). */}
      {!showImage && symbolKey === "crown_ring" && (
        (() => {
          // Radios en unidades de ANCHO de viewBox (no alto: en vestibular el
          // alto incluye la raíz y estiraría el aro). Ligeramente ovalado y con
          // margen para no recortarse contra los bordes en la vista oclusal
          // (viewBox casi cuadrado).
          const rx = vbParts[2] * 0.4;
          const ry = vbParts[2] * 0.47;
          const sw = Math.max(1.6, fontSize * 0.16);
          return (
            <g pointerEvents="none">
              <ellipse
                cx={cx}
                cy={symbolY}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={sw + 1.4}
              />
              <ellipse
                cx={cx}
                cy={symbolY}
                rx={rx}
                ry={ry}
                fill="none"
                stroke={symColor}
                strokeWidth={sw}
              />
            </g>
          );
        })()
      )}

      {/* Símbolo profesional (texto: "ENDO", letra de tratamiento o texto del
          servicio). Halo blanco para legibilidad. Multi-carácter (p.ej. "ENDO"):
          se mantiene el tipo GRANDE y se CONDENSA horizontalmente con textLength
          para que quepa en la corona — encoger el fontSize lo dejaba diminuto y
          borroso. El halo escala con el tamaño del texto para no emborronarlo. */}
      {!showImage &&
        symbolKey !== "cross" &&
        symbolKey !== "crown_ring" &&
        symbol && (
          (() => {
            const isMulti = symbol.length > 1;
            const textFont = isMulti ? fontSize * 0.64 : fontSize;
            const haloSw = Math.max(0.6, textFont * 0.12);
            const multiProps = isMulti
              ? {
                  textLength: fontSize * 2.5,
                  lengthAdjust: "spacingAndGlyphs" as const,
                }
              : {};
            return (
              <text
                x={cx}
                y={symbolY + textFont * 0.35}
                fontSize={textFont}
                fontWeight="700"
                textAnchor="middle"
                fill={symColor}
                stroke="#FFFFFF"
                strokeWidth={haloSw}
                paintOrder="stroke"
                {...multiProps}
                pointerEvents="none"
                style={{ userSelect: "none" }}
              >
                {symbol}
              </text>
            );
          })()
        )}
    </svg>
  );
}

/* ✅ Export nombrado con SSR desactivado */
export const ToothSVGMultiView = dynamic(
  () => Promise.resolve(_ToothSVGMultiView),
  { ssr: false },
);
