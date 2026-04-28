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

type DentalSurface = "oclusal" | "facial" | "lingual" | "mesial" | "distal";

/**
 * Zone-to-surface mapping for the 4 interactive zones in the designer's SVG.
 *
 * The SVG divides each view into 4 quadrants (-01 to -04).
 * Their anatomical meaning depends on the view:
 *
 * VESTIBULAR (frontal) view:
 *   -01 = mesial, -02 = distal, -03 = oclusal/incisal, -04 = cervical/facial
 *
 * OCCLUSAL view:
 *   -01 = mesial, -02 = distal, -03 = vestibular/facial, -04 = lingual/palatinal
 *
 * LINGUAL/PALATINAL (lateral) view:
 *   -01 = mesial, -02 = distal, -03 = oclusal/incisal, -04 = cervical/lingual
 *
 * Note: The designer's SVG has 4 zones while we have 5 surfaces. The missing
 * surface in each view is the one not visible from that angle (e.g., lingual
 * isn't visible from vestibular).
 */
const ZONE_SURFACE_MAP: Record<
  "vestibular" | "occlusal" | "lateral",
  Record<string, DentalSurface>
> = {
  vestibular: {
    "01": "mesial",
    "02": "distal",
    "03": "oclusal",
    "04": "facial",
  },
  occlusal: {
    "01": "mesial",
    "02": "distal",
    "03": "facial",
    "04": "lingual",
  },
  lateral: {
    "01": "mesial",
    "02": "distal",
    "03": "oclusal",
    "04": "lingual",
  },
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
  view: "vestibular" | "occlusal" | "lateral"
): ToothViewPaths {
  const zoneMap = ZONE_SURFACE_MAP[view];

  // Build surface paths from zones
  const surfaces: SurfacePath[] = [];
  const usedSurfaces = new Set<DentalSurface>();

  for (const [zoneId, paths] of Object.entries(viewData.zones)) {
    // Normalize zone ID (handle extended zones like "011", "012")
    const normalizedZone = zoneId.length <= 2 ? zoneId : zoneId.slice(0, 2);
    const surface = zoneMap[normalizedZone];

    if (surface && !usedSurfaces.has(surface)) {
      surfaces.push({
        surface,
        d: mergePaths(paths),
      });
      usedSurfaces.add(surface);
    } else if (surface && usedSurfaces.has(surface)) {
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

  // Fallback: if the view is missing, use the contralateral tooth
  // (same position on the opposite side of the arch — anatomical mirror)
  if (!viewData) {
    const contralateral = getContralateralFDI(fdi);
    viewData = getToothView(contralateral, internalView);
  }

  if (!viewData) return null;

  return adaptToothView(viewData, internalView);
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
