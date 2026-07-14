/**
 * Normalización de texto — ESTÁNDAR DE PROYECTO para todo filtrado/búsqueda
 * insensible a acentos, mayúsculas y puntuación. Úsese en cualquier control
 * o hook que compare/filtre texto (Select, listados, autocompletar…).
 *
 * Este archivo es canónico: NO crear un segundo `text-normalize`/`slug` ad hoc.
 */

// Rango de diacríticos combinantes Unicode (los que NFD separa de su letra).
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Forma canónica acento- y mayúsculas-insensible para buscar/comparar. */
export function normalizeText(input: string): string {
  return (input ?? "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim();
}

/** Slug puntuación-insensible (colapsa separadores). Para claves/matching. */
export function slugify(input: string): string {
  return normalizeText(input)
    .replace(/[^a-z0-9]+/g, " ") // puntuación/símbolos → espacio
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Matcher "fold": cada token del query (separado por espacios) debe aparecer
 * en el haystack (orden indiferente). Ideal para "utc mexico", "peso col",
 * "co pesos". Query vacío → true. Acento/mayúsculas-insensible por ambos lados.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const h = normalizeText(haystack);
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  return tokens.every((t) => h.includes(t));
}
