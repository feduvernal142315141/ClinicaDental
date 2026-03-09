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
    viewBox: "0 0 60 80",
    outline:
      "M8 4 Q6 4 5 6 L3 36 Q2 40 6 40 L54 40 Q58 40 57 36 L55 6 Q54 4 52 4 Z",
    surfaces: [
      // oclusal – borde superior de la corona
      { surface: "oclusal", d: "M8 4 L52 4 L50 12 L10 12 Z" },
      // facial – zona central visible de la corona
      { surface: "facial", d: "M10 12 L50 12 L49 30 L11 30 Z" },
      // lingual – no visible en frontal, franja posterior indicada
      { surface: "lingual", d: "M11 30 L49 30 L48 38 Q30 42 12 38 Z" },
      // mesial – borde izquierdo
      {
        surface: "mesial",
        d: "M5 6 Q6 4 8 4 L10 12 L11 30 L12 38 Q7 36 4 34 L3 36 Q2 20 5 6 Z",
      },
      // distal – borde derecho
      {
        surface: "distal",
        d: "M55 6 Q54 4 52 4 L50 12 L49 30 L48 38 Q53 36 56 34 L57 36 Q58 20 55 6 Z",
      },
    ],
    roots: [
      // raíz mesial
      "M14 40 L12 70 Q12 74 16 74 L20 74 Q22 74 22 70 L20 40",
      // raíz distal
      "M38 40 L40 70 Q40 74 44 74 L48 74 Q48 74 48 70 L46 40",
    ],
    highlights: ["M15 8 Q30 5 45 8", "M14 20 L46 20"],
  },

  oclusal: {
    viewBox: "0 0 60 60",
    outline:
      "M6 6 Q4 6 4 8 L4 52 Q4 54 6 54 L54 54 Q56 54 56 52 L56 8 Q56 6 54 6 Z",
    surfaces: [
      // oclusal – centro
      { surface: "oclusal", d: "M18 18 L42 18 L42 42 L18 42 Z" },
      // facial – arriba (vestibular)
      { surface: "facial", d: "M6 6 L54 6 L42 18 L18 18 Z" },
      // lingual – abajo (palatino/lingual)
      { surface: "lingual", d: "M18 42 L42 42 L54 54 L6 54 Z" },
      // mesial – izquierda
      { surface: "mesial", d: "M6 6 L18 18 L18 42 L6 54 Z" },
      // distal – derecha
      { surface: "distal", d: "M54 6 L56 8 L56 52 L54 54 L42 42 L42 18 Z" },
    ],
    roots: [],
    highlights: [
      "M18 30 L42 30",
      "M30 18 L30 42",
      "M22 22 L38 38",
      "M38 22 L22 38",
    ],
  },

  lateral: {
    viewBox: "0 0 60 80",
    outline:
      "M10 4 Q8 4 7 6 L5 36 Q4 40 8 40 L52 40 Q56 40 55 36 L53 6 Q52 4 50 4 Z",
    surfaces: [
      // oclusal – borde oclusal superior
      { surface: "oclusal", d: "M10 4 L50 4 L48 12 L12 12 Z" },
      // facial – mitad izquierda (hacia el observador lateral)
      {
        surface: "facial",
        d: "M7 6 L12 12 L12 30 Q10 36 6 38 L5 36 Q4 20 7 6 Z",
      },
      // lingual – mitad derecha
      {
        surface: "lingual",
        d: "M53 6 L48 12 L48 30 Q50 36 54 38 L55 36 Q56 20 53 6 Z",
      },
      // mesial – no directamente visible, zona central izq
      { surface: "mesial", d: "M12 12 L30 12 L30 34 L12 30 Z" },
      // distal – zona central der
      { surface: "distal", d: "M30 12 L48 12 L48 30 L30 34 Z" },
    ],
    roots: [
      "M16 40 L14 70 Q14 74 18 74 L22 74 Q24 74 24 70 L22 40",
      "M36 40 L38 70 Q38 74 42 74 L46 74 Q46 74 46 70 L44 40",
    ],
    highlights: ["M15 8 Q30 5 45 8"],
  },
};

/* ================================================================
 *  PREMOLAR
 * ================================================================ */
const premolarPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 50 80",
    outline:
      "M8 6 Q6 4 8 4 L42 4 Q44 4 42 6 L40 36 Q39 40 36 40 L14 40 Q11 40 10 36 Z",
    surfaces: [
      { surface: "oclusal", d: "M8 4 L42 4 L40 12 L10 12 Z" },
      { surface: "facial", d: "M10 12 L40 12 L39 28 L11 28 Z" },
      { surface: "lingual", d: "M11 28 L39 28 L38 38 Q25 42 12 38 Z" },
      {
        surface: "mesial",
        d: "M6 6 Q6 4 8 4 L10 12 L11 28 L12 38 Q8 35 7 32 L8 6 Z",
      },
      {
        surface: "distal",
        d: "M44 6 Q44 4 42 4 L40 12 L39 28 L38 38 Q42 35 43 32 L42 6 Z",
      },
    ],
    roots: ["M18 40 L17 70 Q17 74 20 74 L30 74 Q33 74 33 70 L32 40"],
    highlights: ["M14 8 Q25 5 36 8", "M14 20 L36 20"],
  },

  oclusal: {
    viewBox: "0 0 50 60",
    outline:
      "M5 6 Q3 6 3 8 L3 52 Q3 54 5 54 L45 54 Q47 54 47 52 L47 8 Q47 6 45 6 Z",
    surfaces: [
      { surface: "oclusal", d: "M15 18 L35 18 L35 42 L15 42 Z" },
      { surface: "facial", d: "M5 6 L45 6 L35 18 L15 18 Z" },
      { surface: "lingual", d: "M15 42 L35 42 L45 54 L5 54 Z" },
      { surface: "mesial", d: "M5 6 L15 18 L15 42 L5 54 Z" },
      { surface: "distal", d: "M45 6 L47 8 L47 52 L45 54 L35 42 L35 18 Z" },
    ],
    roots: [],
    highlights: ["M25 18 L25 42"],
  },

  lateral: {
    viewBox: "0 0 50 80",
    outline:
      "M10 6 Q8 4 10 4 L40 4 Q42 4 40 6 L38 36 Q37 40 34 40 L16 40 Q13 40 12 36 Z",
    surfaces: [
      { surface: "oclusal", d: "M10 4 L40 4 L38 12 L12 12 Z" },
      {
        surface: "facial",
        d: "M8 6 L12 12 L12 30 Q11 36 9 38 L10 36 Q9 20 8 6 Z",
      },
      {
        surface: "lingual",
        d: "M42 6 L38 12 L38 30 Q39 36 41 38 L40 36 Q41 20 42 6 Z",
      },
      { surface: "mesial", d: "M12 12 L25 12 L25 34 L12 30 Z" },
      { surface: "distal", d: "M25 12 L38 12 L38 30 L25 34 Z" },
    ],
    roots: ["M20 40 L19 70 Q19 74 22 74 L28 74 Q31 74 31 70 L30 40"],
    highlights: ["M14 8 Q25 5 36 8"],
  },
};

/* ================================================================
 *  CANINO
 * ================================================================ */
const caninoPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 44 80",
    outline:
      "M6 36 Q4 32 8 12 L22 2 L36 12 Q40 32 38 36 Q37 40 34 40 L10 40 Q7 40 6 36 Z",
    surfaces: [
      { surface: "oclusal", d: "M8 12 L22 2 L36 12 L30 16 L14 16 Z" },
      { surface: "facial", d: "M14 16 L30 16 L32 30 L12 30 Z" },
      { surface: "lingual", d: "M12 30 L32 30 L34 38 Q22 42 10 38 Z" },
      {
        surface: "mesial",
        d: "M8 12 L14 16 L12 30 L10 38 Q6 34 5 30 Q4 20 8 12 Z",
      },
      {
        surface: "distal",
        d: "M36 12 L30 16 L32 30 L34 38 Q38 34 39 30 Q40 20 36 12 Z",
      },
    ],
    roots: ["M16 40 L15 72 Q15 76 18 76 L26 76 Q29 76 29 72 L28 40"],
    highlights: ["M16 10 L22 4 L28 10"],
  },

  oclusal: {
    viewBox: "0 0 44 52",
    outline:
      "M4 6 Q2 6 2 8 L2 44 Q2 46 4 46 L40 46 Q42 46 42 44 L42 8 Q42 6 40 6 Z",
    surfaces: [
      { surface: "oclusal", d: "M13 16 L31 16 L31 36 L13 36 Z" },
      { surface: "facial", d: "M4 6 L40 6 L31 16 L13 16 Z" },
      { surface: "lingual", d: "M13 36 L31 36 L40 46 L4 46 Z" },
      { surface: "mesial", d: "M4 6 L13 16 L13 36 L4 46 Z" },
      { surface: "distal", d: "M40 6 L42 8 L42 44 L40 46 L31 36 L31 16 Z" },
    ],
    roots: [],
    highlights: ["M22 16 L22 36"],
  },

  lateral: {
    viewBox: "0 0 44 80",
    outline:
      "M8 36 Q6 32 10 12 L22 4 L34 12 Q38 32 36 36 Q35 40 32 40 L12 40 Q9 40 8 36 Z",
    surfaces: [
      { surface: "oclusal", d: "M10 12 L22 4 L34 12 L28 16 L16 16 Z" },
      { surface: "facial", d: "M6 20 L16 16 L16 30 Q12 36 8 38 Q6 32 6 20 Z" },
      {
        surface: "lingual",
        d: "M38 20 L28 16 L28 30 Q32 36 36 38 Q38 32 38 20 Z",
      },
      { surface: "mesial", d: "M16 16 L22 16 L22 34 L16 30 Z" },
      { surface: "distal", d: "M22 16 L28 16 L28 30 L22 34 Z" },
    ],
    roots: ["M16 40 L15 72 Q15 76 18 76 L26 76 Q29 76 29 72 L28 40"],
    highlights: ["M16 10 L22 4 L28 10"],
  },
};

/* ================================================================
 *  INCISIVO
 * ================================================================ */
const incisivoPaths: ToothTypePaths = {
  frontal: {
    viewBox: "0 0 40 80",
    outline:
      "M6 6 Q5 4 7 4 L33 4 Q35 4 34 6 L32 36 Q31 40 28 40 L12 40 Q9 40 8 36 Z",
    surfaces: [
      { surface: "oclusal", d: "M7 4 L33 4 L32 12 L8 12 Z" },
      { surface: "facial", d: "M8 12 L32 12 L31 28 L9 28 Z" },
      { surface: "lingual", d: "M9 28 L31 28 L30 38 Q20 42 10 38 Z" },
      {
        surface: "mesial",
        d: "M5 6 Q5 4 7 4 L8 12 L9 28 L10 38 Q7 35 6 32 L6 6 Z",
      },
      {
        surface: "distal",
        d: "M35 6 Q35 4 33 4 L32 12 L31 28 L30 38 Q33 35 34 32 L34 6 Z",
      },
    ],
    roots: ["M15 40 L14 72 Q14 76 17 76 L23 76 Q26 76 26 72 L25 40"],
    highlights: ["M12 8 Q20 5 28 8"],
  },

  oclusal: {
    viewBox: "0 0 40 52",
    outline:
      "M4 6 Q2 6 2 8 L2 44 Q2 46 4 46 L36 46 Q38 46 38 44 L38 8 Q38 6 36 6 Z",
    surfaces: [
      { surface: "oclusal", d: "M12 16 L28 16 L28 36 L12 36 Z" },
      { surface: "facial", d: "M4 6 L36 6 L28 16 L12 16 Z" },
      { surface: "lingual", d: "M12 36 L28 36 L36 46 L4 46 Z" },
      { surface: "mesial", d: "M4 6 L12 16 L12 36 L4 46 Z" },
      { surface: "distal", d: "M36 6 L38 8 L38 44 L36 46 L28 36 L28 16 Z" },
    ],
    roots: [],
    highlights: [],
  },

  lateral: {
    viewBox: "0 0 40 80",
    outline:
      "M8 6 Q7 4 9 4 L31 4 Q33 4 32 6 L30 36 Q29 40 26 40 L14 40 Q11 40 10 36 Z",
    surfaces: [
      { surface: "oclusal", d: "M9 4 L31 4 L30 12 L10 12 Z" },
      { surface: "facial", d: "M7 8 L10 12 L10 30 Q9 36 7 38 Q6 30 7 8 Z" },
      {
        surface: "lingual",
        d: "M33 8 L30 12 L30 30 Q31 36 33 38 Q34 30 33 8 Z",
      },
      { surface: "mesial", d: "M10 12 L20 12 L20 34 L10 30 Z" },
      { surface: "distal", d: "M20 12 L30 12 L30 30 L20 34 Z" },
    ],
    roots: ["M15 40 L14 72 Q14 76 17 76 L23 76 Q26 76 26 72 L25 40"],
    highlights: ["M12 8 Q20 5 28 8"],
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
