/**
 * Geometrías SVG de dientes estilo cuadrado/lineal
 * inspiradas en react-odontogram (NewTeethPaths square layout).
 *
 * Cada tipo de diente define paths para 3 vistas (frontal, oclusal, lateral).
 * Cada vista incluye:
 *   - outline: contorno general del diente (stroke only)
 *   - surfaces: 5 regiones clickeables (oclusal, facial, lingual, mesial, distal)
 *   - roots: raíces decorativas (no clickeables)
 *   - highlights: líneas de detalle anatómico (decorativas)
 *
 * viewBox estándar:
 *   - frontal / lateral: "0 0 60 80"
 *   - oclusal: "0 0 60 60"
 */

export interface SurfacePath {
  d: string;
  /** Nombre de la superficie dental */
  surface: "oclusal" | "facial" | "lingual" | "mesial" | "distal";
}

export interface ToothViewPaths {
  viewBox: string;
  outline: string;
  surfaces: SurfacePath[];
  roots: string[];
  highlights: string[];
  /** Centro de la corona para anclar el símbolo (evita dibujarlo sobre la raíz). */
  symbolAnchor?: { x: number; y: number };
}

export interface ToothTypePaths {
  frontal: ToothViewPaths;
  oclusal: ToothViewPaths;
  lateral: ToothViewPaths;
}

/* ================================================================
 *  MOLAR
 * ================================================================ */
const molarPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 100 160",
    outline: "M20,65 C20,120 80,120 80,65 L80,60 C85,10 15,10 20,60 Z",
    surfaces: [
      { surface: "facial", d: "M20,65 C20,110 80,110 80,65 C80,60 20,60 20,65 Z" },
      { surface: "oclusal", d: "M20,110 C35,125 65,125 80,110 C70,115 30,115 20,110 Z" },
      { surface: "mesial", d: "M15,65 C15,90 20,110 25,110 L20,65 Z" },
      { surface: "distal", d: "M85,65 C85,90 80,110 75,110 L80,65 Z" },
      { surface: "lingual", d: "" } // No visible desde esta vista
    ],
    roots: [
      "M25,60 C20,20 10,10 35,5 C45,30 40,50 45,60 Z", // Raíz Mesovestibular
      "M75,60 C80,20 90,10 65,5 C55,30 60,50 55,60 Z", // Raíz Distovestibular
      "M45,55 C50,15 55,15 60,55 Z" // Raíz Palatina (fondo)
    ],
    highlights: [
      "M50,70 L50,110", // Surco oclusovestibular
      "M30,115 Q50,120 70,115" // Curva de las cúspides
    ]
  },

  oclusal: {
    viewBox: "0 0 100 100",
    outline: "M20,20 C50,10 80,10 80,20 C95,50 95,80 80,80 C50,95 20,95 20,80 C5,50 5,20 20,20 Z",
    surfaces: [
      { surface: "oclusal", d: "M50,50 L30,30 C35,20 65,20 70,30 L50,50 M50,50 L70,70 C65,80 35,80 30,70 L50,50" }, // Centro y surcos
      { surface: "facial", d: "M20,20 C40,10 60,10 80,20 L70,30 C55,22 45,22 30,30 Z" },
      { surface: "lingual", d: "M20,80 C40,90 60,90 80,80 L70,70 C55,78 45,78 30,70 Z" },
      { surface: "mesial", d: "M20,20 C10,40 10,60 20,80 L30,70 C22,55 22,45 30,30 Z" },
      { surface: "distal", d: "M80,20 C90,40 90,60 80,80 L70,70 C78,55 78,45 70,30 Z" }
    ],
    roots: [], // En oclusal no se ven las raíces habitualmente
    highlights: [
      "M30,30 L50,50 L70,30", // Surco de desarrollo vestibular
      "M30,70 L50,50 L70,70", // Surco de desarrollo lingual
      "M50,35 A5,5 0 1,0 50,45" // Fosa central
    ]
  },

  lateral: {
    viewBox: "0 0 80 160",
    outline: "M15,65 C10,125 70,125 65,65 C70,10 10,10 15,65 Z",
    surfaces: [
      { surface: "mesial", d: "M15,65 C10,100 70,100 65,65 C60,60 20,60 15,65 Z" },
      { surface: "facial", d: "M10,65 C5,90 15,110 20,115 L15,65 Z" },
      { surface: "lingual", d: "M70,65 C75,90 65,110 60,115 L65,65 Z" },
      { surface: "oclusal", d: "M20,115 C35,120 45,120 60,115 C50,110 30,110 20,115 Z" },
      { surface: "distal", d: "" } // Cara opuesta
    ],
    roots: [
      "M20,60 C10,10 30,-5 40,55 Z", // Raíz Vestibular
      "M60,60 C75,10 50,-5 45,55 Z"  // Raíz Palatina
    ],
    highlights: [
      "M40,70 L40,110", // Línea de transición
      "M20,110 Q40,115 60,110" // Cresta marginal
    ]
  },
};

/* ================================================================
 *  PREMOLAR
 * ================================================================ */
const premolarPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 90 160",
    outline: "M20,65 C20,120 70,120 70,65 L70,60 C75,10 15,10 20,60 Z",
    surfaces: [
      { surface: "facial", d: "M20,65 C20,115 70,115 70,65 C70,60 20,60 20,65 Z" },
      { surface: "oclusal", d: "M20,110 L45,125 L70,110 C55,115 35,115 20,110 Z" }, // Punta de la cúspide
      { surface: "mesial", d: "M15,65 C15,90 20,110 20,110 L20,65 Z" },
      { surface: "distal", d: "M75,65 C75,90 70,110 70,110 L70,65 Z" },
      { surface: "lingual", d: "" }
    ],
    roots: [
      "M35,60 C30,20 20,10 40,5 C45,30 43,50 45,60 Z", // Raíz Vestibular
      "M55,60 C60,20 70,10 50,5 C45,30 47,50 45,60 Z"  // Raíz Palatina (asomando)
    ],
    highlights: [
      "M45,70 L45,110", // Arista central vestibular
      "M20,65 Q45,60 70,65" // Cuello cervical
    ]
  },

  oclusal: {
    viewBox: "0 0 100 100",
    outline: "M15,40 C30,5 70,5 85,40 C95,50 95,60 85,60 C70,95 30,95 15,60 C5,60 5,40 15,40 Z",
    surfaces: [
      { surface: "oclusal", d: "M30,50 C30,40 70,40 70,50 C70,60 30,60 30,50 Z" }, // Fosa central
      { surface: "facial", d: "M15,40 C30,10 70,10 85,40 L70,50 C55,42 45,42 30,50 Z" },
      { surface: "lingual", d: "M15,60 C30,90 70,90 85,60 L70,50 C55,58 45,58 30,50 Z" },
      { surface: "mesial", d: "M15,40 C8,45 8,55 15,60 L30,50 Z" },
      { surface: "distal", d: "M85,40 C92,45 92,55 85,60 L70,50 Z" }
    ],
    roots: [],
    highlights: [
      "M30,50 L70,50", // Surco primario central
      "M25,45 L35,55", // Surco secundario mesial
      "M75,45 L65,55"  // Surco secundario distal
    ]
  },

  lateral: {
    viewBox: "0 0 80 160",
    outline: "M20,65 C15,130 65,130 60,65 C70,10 10,10 20,65 Z",
    surfaces: [
      { surface: "mesial", d: "M20,65 C15,100 65,100 60,65 C55,60 25,60 20,65 Z" },
      { surface: "facial", d: "M20,65 C15,90 25,115 30,120 L20,65 Z" },
      { surface: "lingual", d: "M60,65 C65,90 55,110 50,115 L60,65 Z" },
      { surface: "oclusal", d: "M30,120 L40,110 L50,115 C40,125 35,125 30,120 Z" },
      { surface: "distal", d: "" }
    ],
    roots: [
      "M30,60 C20,10 30,5 35,55 Z", // Raíz 1
      "M50,60 C60,10 50,5 45,55 Z"  // Raíz 2
    ],
    highlights: [
      "M40,70 L40,105", // Depresión mesial característica
      "M30,120 Q40,115 50,115" // Reborde marginal
    ]
  },
};

/* ================================================================
 *  CANINO
 * ================================================================ */
const caninoPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 80 180",
    outline: "M40,5 C15,5 20,140 40,150 C60,140 65,5 40,5 Z",
    surfaces: [
      { surface: "facial", d: "M30,75 C20,110 25,130 40,145 C55,130 60,110 50,75 Z" },
      { surface: "oclusal", d: "M30,135 L40,145 L50,135 C45,138 35,138 30,135 Z" }, // Cúspide incisiva
      { surface: "mesial", d: "M25,80 C18,100 25,130 30,135 L30,80 Z" },
      { surface: "distal", d: "M55,80 C62,100 55,130 50,135 L50,80 Z" },
      { surface: "lingual", d: "" }
    ],
    roots: [
      "M40,5 C25,5 20,50 30,70 L50,70 C60,50 55,5 40,5 Z" // Raíz más larga y gruesa
    ],
    highlights: [
      "M40,75 L40,145", // Caballete o arista central
      "M30,75 Q40,70 50,75" // Cuello cervical marcado
    ]
  },

  oclusal: {
    viewBox: "0 0 100 60",
    outline: "M20,30 C45,2 55,2 80,30 C65,58 35,58 20,30 Z",
    surfaces: [
      { surface: "oclusal", d: "M20,30 L50,25 L80,30 C75,35 25,35 20,30 Z" }, // Vértice de la cúspide
      { surface: "facial", d: "M20,30 C40,5 60,5 80,30 L50,25 Z" },
      { surface: "lingual", d: "M20,30 C40,55 60,55 80,30 L50,35 Z" },
      { surface: "mesial", d: "M15,30 C18,25 18,35 20,30 Z" },
      { surface: "distal", d: "M85,30 C82,25 82,35 80,30 Z" }
    ],
    roots: [],
    highlights: [
      "M50,10 L50,25", // Eminencia vestibular
      "M45,45 Q50,50 55,45" // Cíngulo visible desde arriba
    ]
  },

  lateral: {
    viewBox: "0 0 80 180",
    outline: "M40,5 C25,5 30,145 40,150 C50,145 55,5 40,5 Z",
    surfaces: [
      { surface: "mesial", d: "M35,75 C20,110 35,140 40,145 C45,140 60,110 45,75 Z" },
      { surface: "facial", d: "M35,75 C30,100 35,135 40,145 L38,143 C32,100 32,80 35,75 Z" },
      { surface: "lingual", d: "M45,75 C55,90 55,120 40,145 L42,143 C52,110 52,90 45,75 Z" },
      { surface: "oclusal", d: "M39,145 L41,145 L40,143 Z" },
      { surface: "distal", d: "" }
    ],
    roots: [
      "M40,5 C30,5 35,60 35,70 L45,70 C45,60 50,5 40,5 Z"
    ],
    highlights: [
      "M48,90 Q55,100 48,110", // Cíngulo potente
      "M35,75 Q40,72 45,75" // Curva cervical mesial
    ]
  },
};

/* ================================================================
 *  INCISIVO
 * ================================================================ */
const incisivoPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 80 160",
    outline: "M40,10 C20,10 25,135 30,138 L50,138 C55,135 60,10 40,10 Z",
    surfaces: [
      { surface: "facial", d: "M30,65 C25,100 25,125 30,135 L50,135 C55,125 55,100 50,65 Z" },
      { surface: "oclusal", d: "M30,135 C35,138 45,138 50,135 L50,133 L30,133 Z" },
      { surface: "mesial", d: "M28,70 C22,100 25,130 30,135 L30,70 Z" },
      { surface: "distal", d: "M52,70 C58,100 55,130 50,135 L50,70 Z" },
      { surface: "lingual", d: "" } // No visible
    ],
    roots: [
      "M40,10 C25,10 30,50 30,65 L50,65 C50,50 55,10 40,10 Z" // Raíz única cónica
    ],
    highlights: [
      "M38,75 L38,120", // Lóbulo de desarrollo mesial
      "M42,75 L42,120", // Lóbulo de desarrollo distal
      "M30,65 Q40,60 50,65" // Línea cervical (cuello)
    ]
  },

  oclusal: {
    viewBox: "0 0 100 40",
    outline: "M20,20 C45,5 55,5 80,20 C60,38 40,38 20,20 Z",
    surfaces: [
      { surface: "oclusal", d: "M20,20 C40,18 60,18 80,20 C75,22 25,22 20,20 Z" }, // El borde filoso
      { surface: "facial", d: "M20,20 C40,5 60,5 80,20 L75,18 C55,8 45,8 25,18 Z" },
      { surface: "lingual", d: "M20,20 C40,35 60,35 80,20 L75,22 C55,32 45,32 25,22 Z" },
      { surface: "mesial", d: "M15,20 C18,15 18,25 20,20 Z" },
      { surface: "distal", d: "M85,20 C82,15 82,25 80,20 Z" }
    ],
    roots: [],
    highlights: [
      "M30,20 L70,20" // Línea del borde incisal
    ]
  },

  lateral: {
    viewBox: "0 0 80 160",
    outline: "M40,10 C25,10 30,140 40,145 C50,140 60,10 40,10 Z",
    surfaces: [
      { surface: "mesial", d: "M35,65 C25,90 35,130 40,140 C45,130 55,90 45,65 Z" },
      { surface: "facial", d: "M35,65 C30,90 35,130 40,140 L38,138 C32,100 32,70 35,65 Z" },
      { surface: "lingual", d: "M45,65 C55,85 50,110 40,140 L42,138 C50,110 52,80 45,65 Z" },
      { surface: "oclusal", d: "M39,140 L41,140 L40,138 Z" },
      { surface: "distal", d: "" }
    ],
    roots: [
      "M40,10 C30,10 35,50 35,65 L45,65 C45,50 50,10 40,10 Z"
    ],
    highlights: [
      "M45,85 Q50,95 45,105", // Curvatura del Cíngulo
      "M35,65 Q40,62 45,65" // Cuello anatómico lateral
    ]
  },
};

/* ================================================================
 *  EXPORTS
 * ================================================================ */

export const toothSquarePaths: Record<string, ToothTypePaths> = {
  molar: molarPaths,
  premolar: premolarPaths,
  canino: caninoPaths,
  incisivo: incisivoPaths,
};
