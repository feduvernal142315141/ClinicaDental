import type { ToothNotation } from "@/lib/odontogram/notation";
import { normalizeText } from "@/lib/utils/text";

/**
 * Catálogo de nomenclaturas dentales (capa de datos, sin JSX). El valor
 * almacenado es el `ToothNotation` canónico del módulo de odontograma; aquí
 * sólo viven los metadatos de presentación (rótulo, subtítulo y texto de
 * búsqueda) que consume el Select de "Opciones Generales".
 *
 * La capa de entidad se mantiene SIN runtime del módulo de odontograma: se
 * importa únicamente el TIPO (`import type` se borra al compilar). Para no
 * reescribir la lista de valores, el mapa de metadatos se declara como
 * `Record<ToothNotation, …>`: si mañana el módulo añade una cuarta
 * nomenclatura, este fichero deja de compilar en vez de olvidarla en silencio.
 *
 * La nomenclatura es presentación y sólo eso: el dato guardado sigue siendo
 * FDI/ISO 3950 en la base de datos, en el snapshot y en la API.
 */
export interface ToothNotationCatalogEntry {
  /** Valor almacenado, ej. "fdi". */
  value: ToothNotation;
  /** Display: "FDI / ISO 3950". */
  label: string;
  /** Subtítulo de la fila: en qué se distingue. */
  description: string;
  /** Normalizado(label + descripción + sinónimos y regiones de uso). */
  searchText: string;
}

type ToothNotationMeta = Omit<ToothNotationCatalogEntry, "value" | "searchText"> & {
  /** Sinónimos y regiones que deben acertar en una búsqueda. */
  aliases: string;
};

/**
 * Orden de declaración = orden de aparición en el desplegable: FDI primero
 * (es el valor por defecto), luego Universal y Palmer.
 */
const META: Record<ToothNotation, ToothNotationMeta> = {
  fdi: {
    label: "FDI / ISO 3950",
    description: "Estándar internacional, dos dígitos",
    aliases: "iso 3950 oms internacional latinoamerica europa dos digitos 11 48",
  },
  universal: {
    label: "Universal / ADA",
    description: "Numeración 1–32",
    aliases: "ada estados unidos eeuu usa americana 1 32",
  },
  palmer: {
    label: "Palmer",
    description: "Dígito con símbolo de cuadrante",
    aliases: "zsigmondy reino unido ortodoncia cuadrante corchete simbolo",
  },
};

export const TOOTH_NOTATION_CATALOG: readonly ToothNotationCatalogEntry[] =
  Object.entries(META).map(([value, meta]) => ({
    value: value as ToothNotation,
    label: meta.label,
    description: meta.description,
    searchText: normalizeText(
      `${value} ${meta.label} ${meta.description} ${meta.aliases}`,
    ),
  }));
