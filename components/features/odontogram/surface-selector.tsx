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
      helper: anterior ? "Palatino visible" : "Lingual visible",
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
          className="flex h-full min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="mb-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
              {viewMeta.label}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {viewMeta.helper}
            </p>
          </div>

          <div className="flex min-h-40 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-muted-foreground">
            SVG no disponible para esta vista
          </div>
        </div>
      );
    }

    const visibleSurfaceLabels = viewPaths.surfaces
      .filter((surfacePath) => Boolean(surfacePath.d))
      .map(
        (surfacePath) =>
          getSurfaceLabel(surfacePath.surface as ToothSurface, anterior).short,
      )
      .join(" · ");

    return (
      <div
        key={view}
        className="flex h-full min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
              {viewMeta.label}
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {viewMeta.helper}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {visibleSurfaceLabels}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/60 p-3">
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

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          {surfaces.length} superficie{surfaces.length === 1 ? "" : "s"} activas
        </div>
      </div>
    </div>
  );
}
