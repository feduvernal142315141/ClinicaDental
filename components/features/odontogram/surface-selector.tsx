"use client";

import { useState } from "react";
import type { ToothSurface, SurfaceState } from "./types";
import type { SurfacePath } from "./tooth-square-paths";
import { cn } from "@/lib/odontogram/utils";
import { getDesignedToothPaths } from "./teeth-svg-adapter";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services/ToothTypeService";

interface SurfaceSelectorProps {
  toothNumber: number;
  surfaces: SurfaceState[];
  onSurfaceToggle: (surface: ToothSurface) => void;
  disabled?: boolean;
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

export function SurfaceSelector({
  toothNumber,
  surfaces,
  onSurfaceToggle,
  disabled,
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
      label: "Frontal",
      helper: anterior ? "Labial visible" : "Vestibular visible",
    },
    {
      key: "oclusal",
      label: anterior ? "Incisal" : "Oclusal",
      helper: "Superficie central",
    },
    {
      key: "lateral",
      label: "Lateral",
      // Palatino/Lingual depende de la ARCADA, no de anterior/posterior.
      helper: maxillary ? "Palatino visible" : "Lingual visible",
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

    const visibleSurfaceLabels = viewPaths.surfaces
      .filter((surfacePath) => Boolean(surfacePath.d))
      .map(
        (surfacePath) => surfaceLabel(surfacePath.surface as ToothSurface).short,
      )
      .join(" · ");

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

                const surface = surfacePath.surface as ToothSurface;
                const selected = isSelected(surface);
                const highlighted = activeSurface === surface;
                const color = getSurfaceColor(surface);

                return (
                  <path
                    key={`${view}-${surfacePath.surface}`}
                    d={surfacePath.d}
                    fill={selected ? color : THEME.surfaceDefault}
                    fillOpacity={selected ? 0.88 : highlighted ? 0.94 : 1}
                    stroke={
                      selected || highlighted ? "#0369A1" : THEME.outlineStroke
                    }
                    strokeWidth={selected || highlighted ? "1.4" : "0.5"}
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

        <div className="rounded-full border border-hairline bg-elevated px-3 py-1.5 text-xs font-medium text-subtle shadow-sm tabular-nums">
          {surfaces.length} superficie{surfaces.length === 1 ? "" : "s"} activas
        </div>
      </div>
    </div>
  );
}
