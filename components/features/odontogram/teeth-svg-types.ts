/**
 * Tipos compartidos de geometría SVG dental (por vista y tipo de diente).
 * Extraídos de tooth-square-paths.ts al eliminar su data muerta.
 */

export interface SurfacePath {
  d: string;
  /** Nombre de la superficie dental */
  surface:
    | "oclusal"
    | "facial"
    | "lingual"
    | "mesial"
    | "distal"
    | "cervicalVestibular"
    | "cervicalLingual";
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
