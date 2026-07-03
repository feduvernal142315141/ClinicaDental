/**
 * teeth-svg-adapter.ts
 * --------------------
 * Adapts the auto-generated teeth-svg-data (extracted from the designer's SVG)
 * into the ToothViewPaths format consumed by the rendering components.
 *
 * Responsibilities:
 * 1. Map SVG zones (-01 to -04) to dental surfaces (oclusal, facial, lingual, mesial, distal)
 * 2. Merge multi-path arrays into single path strings
 * 3. Handle the L/P view normalization (both → "lateral")
 * 4. Include roots in vestibular view (always visible per user decision)
 */

import {
  TOOTH_SVG_REGISTRY,
  getToothView,
  type ToothViewData,
} from "./teeth-svg-data";
import type { ToothViewPaths, SurfacePath } from "./tooth-square-paths";

type DentalSurface =
  | "oclusal"
  | "facial"
  | "lingual"
  | "mesial"
  | "distal"
  | "cervicalVestibular"
  | "cervicalLingual";

/**
 * La asignación zona→superficie ya NO es una tabla fija por número de zona: el
 * número de zona del SVG es orden de dibujo de Illustrator, no anatomía (la misma
 * etiqueta significa caras distintas según diente/cuadrante/vista). El extractor
 * la calcula por GEOMETRÍA (centroide) y la emite en `viewData.zoneSurfaces`.
 * Aquí solo la leemos. Ver scripts/extract-teeth-svg.mjs (classifyView).
 */

/** Espejo M↔D usado cuando una vista se toma del diente contralateral. */
const MIRROR_SURFACE: Partial<Record<DentalSurface, DentalSurface>> = {
  mesial: "distal",
  distal: "mesial",
};

/**
 * Merge an array of SVG path strings into a single path string.
 */
function mergePaths(paths: string[]): string {
  return paths.join(" ");
}

/**
 * Convert the extracted SVG data for a specific tooth/view into
 * the ToothViewPaths format used by the rendering engine.
 */
function adaptToothView(
  viewData: ToothViewData,
  mirrored = false,
): ToothViewPaths {
  const zoneSurfaces = viewData.zoneSurfaces ?? {};

  // Build surface paths from zones using the geometric classification baked in
  // by the extractor. `mirrored` swaps mesial↔distal when the view was borrowed
  // from the contralateral tooth (opposite side → proximal faces inverted).
  const surfaces: SurfacePath[] = [];
  const usedSurfaces = new Set<DentalSurface>();

  for (const [zoneId, paths] of Object.entries(viewData.zones)) {
    let surface = zoneSurfaces[zoneId] as DentalSurface | undefined;
    if (!surface) continue;
    if (mirrored && MIRROR_SURFACE[surface]) {
      surface = MIRROR_SURFACE[surface] as DentalSurface;
    }

    if (!usedSurfaces.has(surface)) {
      surfaces.push({
        surface,
        d: mergePaths(paths),
      });
      usedSurfaces.add(surface);
    } else {
      // Merge with existing surface path
      const existing = surfaces.find((s) => s.surface === surface);
      if (existing) {
        existing.d += " " + mergePaths(paths);
      }
    }
  }

  // Add empty path for the missing 5th surface (the one not visible from this angle)
  const allSurfaces: DentalSurface[] = [
    "oclusal",
    "facial",
    "lingual",
    "mesial",
    "distal",
    "cervicalVestibular",
    "cervicalLingual",
  ];
  for (const s of allSurfaces) {
    if (!usedSurfaces.has(s)) {
      surfaces.push({ surface: s, d: "" });
    }
  }

  // Build outline from the outline paths
  const outline = mergePaths(viewData.outline);

  // Build roots (only for vestibular view)
  const roots = viewData.root ? viewData.root : [];

  return {
    viewBox: viewData.viewBox,
    outline,
    surfaces,
    roots,
    highlights: [], // The designer's SVG doesn't have separate highlight paths
    symbolAnchor: viewData.symbolAnchor,
  };
}

/**
 * Get the contralateral tooth number.
 * Contralateral = same position, opposite side of the same arch.
 * Q1 ↔ Q2 (upper right ↔ upper left), Q3 ↔ Q4 (lower right ↔ lower left).
 *
 * Example: 18 → 28, 28 → 18, 31 → 41, 47 → 37
 */
function getContralateralFDI(fdi: string): string {
  const quadrant = parseInt(fdi[0], 10);
  const position = fdi[1];
  const contralateralQuadrant: Record<number, number> = {
    1: 2,
    2: 1,
    3: 4,
    4: 3,
  };
  return `${contralateralQuadrant[quadrant]}${position}`;
}

/**
 * Get the adapted ToothViewPaths for a specific tooth and view.
 * This is the main entry point for the rendering components.
 *
 * When a view is missing for a tooth (e.g., 18P not in the designer's SVG),
 * the adapter falls back to the contralateral tooth (28P), which is the
 * anatomical mirror on the same arch.
 *
 * @param toothNumber - FDI tooth number (11-48)
 * @param view - "frontal" | "oclusal" | "lateral"
 * @returns ToothViewPaths or null if tooth data is not available
 */
export function getDesignedToothPaths(
  toothNumber: number,
  view: "frontal" | "oclusal" | "lateral"
): ToothViewPaths | null {
  const fdi = String(toothNumber);

  // Map component view names to our internal view names
  const viewMap: Record<string, "vestibular" | "occlusal" | "lateral"> = {
    frontal: "vestibular",
    oclusal: "occlusal",
    lateral: "lateral",
  };

  const internalView = viewMap[view];
  let viewData = getToothView(fdi, internalView);
  let mirrored = false;

  // Fallback: if the view is missing, use the contralateral tooth
  // (same position on the opposite side of the arch — anatomical mirror).
  // Marca `mirrored` para invertir mesial↔distal en la clasificación.
  if (!viewData) {
    const contralateral = getContralateralFDI(fdi);
    viewData = getToothView(contralateral, internalView);
    mirrored = true;
  }

  if (!viewData) return null;

  const result = adaptToothView(viewData, mirrored);

  // Volteo vertical de la vista LATERAL (Palatino/Lingual). El arte del diseñador
  // dibuja el lateral invertido respecto a su propia vestibular (corona y raíz al
  // revés). La vestibular ya es correcta por arcada, así que UN mismo espejo
  // vertical corrige ambas arcadas a la vez (13.P → corona-abajo, 43.L →
  // corona-arriba) SIN condicionar por cuadrante. Se calcula desde el viewBox
  // ("minX minY width height") y solo se aplica al lateral; frontal/oclusal
  // quedan sin transform. La geometría se envuelve en <g transform> en ambos
  // renderers, así rejilla y panel de detalle quedan idénticos.
  if (internalView === "lateral") {
    const [, minY, , height] = result.viewBox.split(" ").map(Number);
    if (Number.isFinite(minY) && Number.isFinite(height)) {
      result.transform = `translate(0, ${2 * minY + height}) scale(1,-1)`;
    }
  }

  // Fallback for missing roots: if the vestibular view exists but has no root,
  // borrow the root data from the contralateral tooth (e.g., 13V has no ROOT
  // in the SVG but 23V does — they are anatomical mirrors)
  if (internalView === "vestibular" && result.roots.length === 0) {
    const contralateral = getContralateralFDI(fdi);
    const contralateralData = getToothView(contralateral, "vestibular");
    if (contralateralData?.root && contralateralData.root.length > 0) {
      result.roots = contralateralData.root;
    }
  }

  return result;
}

/**
 * Check if a specific tooth has designed SVG data available.
 */
export function hasDesignedTooth(toothNumber: number): boolean {
  return String(toothNumber) in TOOTH_SVG_REGISTRY;
}

/**
 * Get all available tooth numbers.
 */
export function getAvailableTeeth(): number[] {
  return Object.keys(TOOTH_SVG_REGISTRY).map(Number);
}
