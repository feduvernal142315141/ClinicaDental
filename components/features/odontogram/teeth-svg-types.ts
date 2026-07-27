/**
 * Tipos compartidos de geometría SVG dental (por vista y tipo de diente).
 * Extraídos de tooth-square-paths.ts al eliminar su data muerta.
 */

import type { ToothSurface } from "@/lib/odontogram/domain/odontogram/types/surface.types";

export interface SurfacePath {
  d: string;
  /**
   * Celda de superficie dental. Reutiliza el tipo del dominio en vez de
   * redeclarar la unión: existir dos vocabularios de caras es cómo se cuelan
   * códigos huérfanos (una lista que se queda corta pinta las superficies de
   * NEGRO en silencio). `surface.types.ts` es la única fuente de verdad.
   */
  surface: ToothSurface;
}

export interface ToothViewPaths {
  viewBox: string;
  outline: string;
  surfaces: SurfacePath[];
  roots: string[];
  highlights: string[];
  /** Centro de la corona para anclar el símbolo (evita dibujarlo sobre la raíz). */
  symbolAnchor?: { x: number; y: number };
  /**
   * Centro de la RAÍZ para anclar símbolos que van cerca de la raíz (p.ej. el
   * círculo de corona). Solo presente en la vista con raíz (vestibular/frontal).
   */
  rootAnchor?: { x: number; y: number };
  /**
   * Transform SVG aplicado SOLO a la vista lateral (Palatino/Lingual) para
   * corregir el volteo vertical del arte: el lateral viene invertido respecto
   * a su propia vestibular. Envuelve el grupo de geometría (raíces + caras +
   * contorno + highlights). El símbolo se dibuja FUERA de este grupo y se ancla
   * a la corona ya volteada, para no espejar el glifo. Ausente en frontal/oclusal.
   */
  transform?: string;
}

export interface ToothTypePaths {
  frontal: ToothViewPaths;
  oclusal: ToothViewPaths;
  lateral: ToothViewPaths;
}
