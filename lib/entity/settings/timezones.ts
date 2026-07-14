import { normalizeText } from "@/lib/utils/text";

/**
 * Catálogo de zonas horarias (capa de datos, sin JSX). El valor almacenado es
 * el id IANA. Los offsets son la etiqueta ESTÁNDAR: correctos todo el año para
 * las 4 zonas LATAM (sin DST). Las 3 zonas de EE. UU. sí observan DST → su
 * offset lleva sufijo "(est.)" para no engañar durante el horario de verano;
 * la funcionalidad no se afecta (se guarda el id IANA). El `searchText` incluye
 * variantes del offset (`utc-5`, `-5`, `-05:00`) para que la búsqueda por
 * offset acierte.
 */
export interface TimezoneCatalogEntry {
  /** id IANA almacenado, ej. "America/La_Paz". */
  value: string;
  country: string;
  city: string;
  flag: string;
  /** Etiqueta de offset a mostrar, ej. "UTC-04:00" o "UTC-05:00 (est.)". */
  offset: string;
  /** true solo para zonas que observan horario de verano (EE. UU.). */
  observesDst?: boolean;
  /** Display: "Bolivia · La Paz". */
  label: string;
  /** Normalizado(country + city + IANA + offset + variantes). */
  searchText: string;
}

type RawZone = Omit<
  TimezoneCatalogEntry,
  "label" | "searchText" | "offset"
> & { baseOffset: string };

const RAW: RawZone[] = [
  { value: "America/La_Paz", country: "Bolivia", city: "La Paz", flag: "🇧🇴", baseOffset: "UTC-04:00" },
  { value: "America/Bogota", country: "Colombia", city: "Bogotá", flag: "🇨🇴", baseOffset: "UTC-05:00" },
  { value: "America/Mexico_City", country: "México", city: "Ciudad de México", flag: "🇲🇽", baseOffset: "UTC-06:00" },
  { value: "America/Argentina/Buenos_Aires", country: "Argentina", city: "Buenos Aires", flag: "🇦🇷", baseOffset: "UTC-03:00" },
  { value: "America/New_York", country: "Estados Unidos", city: "New York (Este)", flag: "🇺🇸", baseOffset: "UTC-05:00", observesDst: true },
  { value: "America/Chicago", country: "Estados Unidos", city: "Chicago (Central)", flag: "🇺🇸", baseOffset: "UTC-06:00", observesDst: true },
  { value: "America/Los_Angeles", country: "Estados Unidos", city: "Los Angeles (Pacífico)", flag: "🇺🇸", baseOffset: "UTC-08:00", observesDst: true },
];

/** "UTC-05:00" → "utc-5 -5 -05:00 utc-05:00" para el searchText. */
function offsetVariants(offset: string): string {
  const m = offset.match(/UTC([+-])(\d{2}):(\d{2})/);
  if (!m) return offset;
  const [, sign, hh, mm] = m;
  const h = String(Number(hh));
  return `utc${sign}${h} ${sign}${h} ${sign}${hh}:${mm} ${offset}`;
}

export const TIMEZONE_CATALOG: readonly TimezoneCatalogEntry[] = RAW.map(
  (z) => ({
    value: z.value,
    country: z.country,
    city: z.city,
    flag: z.flag,
    observesDst: z.observesDst,
    offset: z.observesDst ? `${z.baseOffset} (est.)` : z.baseOffset,
    label: `${z.country} · ${z.city}`,
    searchText: normalizeText(
      `${z.country} ${z.city} ${z.value} ${offsetVariants(z.baseOffset)}`,
    ),
  }),
).sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

/** Paridad con el uso previo ({value,label}); el enriquecido se arma en la UI. */
export const TIMEZONE_OPTIONS: readonly { value: string; label: string }[] =
  TIMEZONE_CATALOG.map((z) => ({ value: z.value, label: z.label }));

export const DEFAULT_TIMEZONE = "America/La_Paz";
