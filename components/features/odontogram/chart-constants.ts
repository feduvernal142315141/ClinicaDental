/**
 * Constantes de dibujo de la carta dental. Módulo HOJA: sin imports, a
 * propósito.
 *
 * Vivían dentro de los componentes que las usan, así que quien solo quería la
 * paleta —la previsualización de nomenclatura en Configuración— se traía la
 * tienda, el lienzo con zoom y la leyenda: ~199 KB gzip en una pantalla que no
 * dibuja ningún odontograma real. Aquí no importan a nadie, así que no
 * arrastran a nadie.
 */

/** Colores del tema. Una sola paleta: la carta, el selector de caras y la
 *  previsualización dibujan la misma pieza y no pueden divergir. */
export const THEME = {
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

/**
 * Las cuatro filas de la carta, en ORDEN DE RENDERIZADO (vista del operador):
 * los cuadrantes derechos del paciente van invertidos porque caen a la
 * izquierda del dibujo. No es el orden canónico de enumeración —ese vive
 * ascendente en la tienda— sino cómo se pinta.
 */
export const QUADRANT_ROWS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
} as const;
