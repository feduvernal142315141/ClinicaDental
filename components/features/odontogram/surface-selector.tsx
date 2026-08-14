"use client";

import { useState } from "react";
import type {
  ToothSurface,
  SurfaceState,
  SurfaceView,
  SurfaceZone,
} from "./types";
import {
  getSurfaceView,
  getSurfaceZone,
  projectToCanonicalSurface,
} from "./types";
import type { SurfacePath } from "./teeth-svg-types";
import { cn } from "@/lib/odontogram/utils";
import { getDesignedToothPaths } from "./teeth-svg-adapter";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services/ToothTypeService";

interface SurfaceSelectorProps {
  toothNumber: number;
  surfaces: SurfaceState[];
  onSurfaceToggle: (surface: ToothSurface) => void;
  disabled?: boolean;
  /**
   * Previsualización de la plantilla apuntada en el panel de abajo: qué celdas
   * escribiría (`affected`) y cuáles dejaría intactas (`ignored`). Se dibuja
   * como CONTORNO, nunca como relleno: rellenarlas afirmaría un estado clínico
   * que todavía no se ha guardado.
   */
  preview?: {
    affected: Set<ToothSurface>;
    ignored: Set<ToothSurface>;
    color: string;
  } | null;
}

/* ---- Tema visual idéntico al odontograma principal ---- */
const THEME = {
  surfaceDefault: "#FFFFFF",
  outlineStroke: "#4A5568",
  rootFill: "#F7FAFC",
  rootStroke: "#718096",
  highlightStroke: "#C4B89A",
} as const;

type SelectorView = "frontal" | "oclusal" | "lateral";

/* Orden canónico de lectura odontológica M · O/I · D · V · P/L · C. Rige el
   orden de presentación, no la geometría. */
const SURFACE_FAMILY_RANK: Record<SurfaceZone, number> = {
  mesial: 1,
  oclusal: 2,
  distal: 3,
  facial: 4,
  lingual: 5,
  cervical: 6,
};

const SURFACE_VIEW_RANK: Record<SurfaceView, number> = {
  vestibular: 1,
  oclusal: 2,
  lateral: 3,
};

/**
 * Rango = familia*10 + vista. Las celdas de una misma familia quedan juntas y
 * ordenadas por vista (M·V, M·O, M·P), y los códigos sin sufijo (el cuerpo de
 * una cara, la mesa oclusal y los legacy sin vista) encabezan su familia con
 * decena redonda. Se calcula, no se tabula: una tabla literal se queda corta en
 * cuanto aparece una celda nueva y la manda al final sin avisar.
 *
 * Se EXPORTA porque el resumen de selección de `surfaces-tab` tiene que leerse
 * en el mismo orden canónico M · O/I · D · V · P/L · C que la fila de
 * abreviaturas de cada vista. Con hasta 13 celdas por diente, mostrarlas en
 * orden de clic convierte el resumen en ruido.
 */
export const getSurfaceRank = (surface: ToothSurface): number => {
  const family = SURFACE_FAMILY_RANK[getSurfaceZone(surface)];
  const view = getSurfaceView(surface);
  // Sin sufijo (el código coincide con su familia) → decena redonda.
  const hasViewSuffix = surface !== getSurfaceZone(surface);
  return family * 10 + (hasViewSuffix && view ? SURFACE_VIEW_RANK[view] : 0);
};

export function SurfaceSelector({
  toothNumber,
  surfaces,
  onSurfaceToggle,
  disabled,
  preview,
}: SurfaceSelectorProps) {
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(
    null,
  );
  const anterior = ToothTypeService.isAnterior(toothNumber);
  const maxillary = ToothTypeService.isMaxillary(toothNumber);
  const surfaceLabel = (surface: ToothSurface) =>
    ToothTypeService.getSurfaceLabel(toothNumber, surface);

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

  // El contador va PROYECTADO a superficies canónicas ADA/CDT: una MOD son 3
  // superficies (M, O, D) aunque se hayan marcado 5 celdas. Contar celdas haría
  // que una MOD se reportara/facturara como "5 superficies" y el número dejaría
  // de ser utilizable fuera del producto. El granular vive en el `title`.
  const canonicalSurfaceCount = new Set(
    surfaces.map((s) => projectToCanonicalSurface(s.surface)),
  ).size;

  // Determinar la última superficie interactuada (hover o la última seleccionada)
  const activeSurface =
    hoveredSurface ??
    (surfaces.length > 0 ? surfaces[surfaces.length - 1].surface : null);

  const views: Array<{
    key: SelectorView;
    label: string;
    helper: string;
  }> = [
    {
      key: "frontal",
      label: ToothTypeService.getViewTitle(toothNumber, "frontal"),
      helper: anterior ? "Cara labial" : "Cara bucal",
    },
    {
      key: "oclusal",
      label: ToothTypeService.getViewTitle(toothNumber, "oclusal"),
      helper: anterior ? "Borde incisal" : "Tabla oclusal",
    },
    {
      key: "lateral",
      label: ToothTypeService.getViewTitle(toothNumber, "lateral"),
      // Palatino/Lingual depende de la ARCADA, no de anterior/posterior.
      helper: maxillary ? "Cara palatina" : "Cara lingual",
    },
  ];

  const renderView = (view: SelectorView) => {
    const viewPaths = getDesignedToothPaths(toothNumber, view);
    const viewMeta = views.find((item) => item.key === view);

    if (!viewMeta) return null;

    if (!viewPaths) {
      return (
        <div
          key={view}
          className="flex h-full min-h-56 flex-col rounded-2xl border border-hairline bg-surface p-3 shadow-sm"
        >
          <div className="mb-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              {viewMeta.label}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {viewMeta.helper}
            </p>
          </div>

          <div className="flex min-h-40 flex-1 items-center justify-center rounded-xl border border-dashed border-hairline bg-hover text-center text-xs text-muted-foreground">
            SVG no disponible para esta vista
          </div>
        </div>
      );
    }

    // Separador " / ": el " · " chocaría con el punto medio INTERNO de las
    // abreviaturas cualificadas (M·V), y la fila se volvería ilegible.
    const visibleSurfaceLabels = [...viewPaths.surfaces]
      .filter((surfacePath) => Boolean(surfacePath.d))
      .sort((a, b) => getSurfaceRank(a.surface) - getSurfaceRank(b.surface))
      .map((surfacePath) => surfaceLabel(surfacePath.surface).short)
      .join(" / ");

    return (
      <div
        key={view}
        className="flex h-full min-h-56 flex-col rounded-2xl border border-hairline bg-surface p-3 shadow-sm"
      >
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              {viewMeta.label}
            </p>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-subtle">
              {viewMeta.helper}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {visibleSurfaceLabels}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-xl border border-hairline bg-hover p-3">
          <div
            className={cn(
              "mx-auto w-full",
              view === "oclusal" ? "max-w-40" : "max-w-35",
            )}
          >
            <svg
              viewBox={viewPaths.viewBox}
              className={cn(
                "h-auto w-full",
                view === "oclusal" ? "aspect-square" : "aspect-4/5",
              )}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Grupo de geometría: en la vista lateral se voltea verticalmente
                  (viewPaths.transform). Pintura y zonas clicables se voltean
                  juntas, así el hit-testing sigue alineado. En frontal/oclusal
                  transform === undefined → sin cambios. */}
              <g transform={viewPaths.transform}>
              {viewPaths.roots.map((rootD, index) => (
                <path
                  key={`${view}-root-${index}`}
                  d={rootD}
                  fill={THEME.rootFill}
                  stroke={THEME.rootStroke}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ))}

              {viewPaths.surfaces.map((surfacePath: SurfacePath) => {
                if (!surfacePath.d) return null;

                const surface = surfacePath.surface;
                const selected = isSelected(surface);
                const highlighted = activeSurface === surface;
                const color = getSurfaceColor(surface);
                const willBeWritten = preview?.affected.has(surface) ?? false;
                const willBeIgnored = preview?.ignored.has(surface) ?? false;

                return (
                  <path
                    key={`${view}-${surfacePath.surface}`}
                    d={surfacePath.d}
                    fill={selected ? color : THEME.surfaceDefault}
                    fillOpacity={
                      // Una celda marcada que la plantilla NO va a tocar se
                      // atenúa: es la mitad visual de "2 de las 3 caras".
                      willBeIgnored
                        ? 0.35
                        : selected
                          ? 0.88
                          : highlighted
                            ? 0.94
                            : 1
                    }
                    stroke={
                      willBeWritten
                        ? preview!.color
                        : selected || highlighted
                          ? "#0369A1"
                          : THEME.outlineStroke
                    }
                    strokeWidth={
                      willBeWritten ? "2.2" : selected || highlighted ? "1.4" : "0.5"
                    }
                    strokeDasharray={willBeWritten ? "3 2" : undefined}
                    strokeLinejoin="round"
                    className={cn(
                      "transition-all duration-150",
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:brightness-95",
                      highlighted && !disabled && "brightness-95",
                    )}
                    onClick={() => handleSurfaceClick(surface)}
                    onMouseEnter={() => setHoveredSurface(surface)}
                    onMouseLeave={() => setHoveredSurface(null)}
                  />
                );
              })}

              <path
                d={viewPaths.outline}
                fill="none"
                stroke={THEME.outlineStroke}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />

              {viewPaths.highlights.map((highlightPath, index) => (
                <path
                  key={`${view}-highlight-${index}`}
                  d={highlightPath}
                  fill="none"
                  stroke={THEME.highlightStroke}
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ))}
              </g>
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Seleccion de caras
        </p>
        <p className="text-sm text-muted-foreground">
          Haz clic sobre cualquiera de las tres vistas del diente para marcar
          las superficies clinicamente visibles en el odontograma.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {views.map((view) => renderView(view.key))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <div
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all",
            activeSurface
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {activeSurface
            ? `${isSelected(activeSurface) ? "✓" : ""} ${
                surfaceLabel(activeSurface).full
              }`
            : "Esperando selección..."}
        </div>

        <div
          className="rounded-full border border-hairline bg-elevated px-3 py-1.5 text-xs font-medium text-subtle shadow-sm tabular-nums"
          title={`${surfaces.length} celda${surfaces.length === 1 ? "" : "s"} marcada${surfaces.length === 1 ? "" : "s"}`}
        >
          {canonicalSurfaceCount} superficie
          {canonicalSurfaceCount === 1 ? "" : "s"} activa
          {canonicalSurfaceCount === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
