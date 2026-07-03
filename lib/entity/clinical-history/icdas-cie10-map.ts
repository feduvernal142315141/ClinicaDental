/**
 * Mapa ICDAS II → CIE-10 dental
 *
 * Sugiere uno o más diagnósticos CIE-10 provisionales a partir de un puntaje
 * ICDAS y una referencia de diente/cara proveniente del odontograma.
 *
 * Protocolo clínico base: ICDAS II / ICCMS (International Caries Classification
 * and Management System). Los resultados son SIEMPRE provisionales y requieren
 * confirmación clínica del profesional.
 *
 * NOTA: importa el *tipo* ICDASScore desde el módulo odontograma (solo lectura,
 * NO edita ningún archivo de lib/odontogram).
 */

import type { ICDASScore } from "@/lib/odontogram/domain/odontogram/types/surface.types";
import type { ToothRef, VisitDiagnosis } from "./index";

// ---------------------------------------------------------------------------
// Definición del mapa
// ---------------------------------------------------------------------------

/**
 * Entrada del mapa para un puntaje ICDAS.
 */
interface IcdasMapEntry {
  /** Códigos CIE-10 sugeridos (en orden de probabilidad descendente). */
  suggestions: Array<{ code: string; label: string }>;
  /**
   * Descripción clínica del estadio ICDAS, usada como anotación en el
   * diagnóstico generado (no se envía al backend, solo es UX).
   */
  clinicalNote: string;
}

/**
 * Mapa completo ICDAS 0-6 → sugerencias CIE-10.
 *
 * Referencias:
 * - ICDAS 0        → Sano (sin lesión visible). Sin diagnóstico de caries.
 * - ICDAS 1-2      → Lesión incipiente en esmalte → K02.0
 * - ICDAS 3        → Microcavitación / pérdida de esmalte → K02.0 o K02.1
 * - ICDAS 4        → Sombra oscura de dentina subyacente → K02.1
 * - ICDAS 5        → Cavitación con dentina visible → K02.1
 * - ICDAS 6        → Cavitación extensa → K02.1 / K02.5 (posible exposición pulpar)
 */
const ICDAS_CIE10_MAP: Record<ICDASScore, IcdasMapEntry> = {
  0: {
    suggestions: [],
    clinicalNote: "Superficie sana — sin lesión cariosa detectable.",
  },
  1: {
    suggestions: [{ code: "K02.0", label: "Caries limitada al esmalte" }],
    clinicalNote: "Cambio visual incipiente en esmalte (primer estadio ICDAS).",
  },
  2: {
    suggestions: [{ code: "K02.0", label: "Caries limitada al esmalte" }],
    clinicalNote: "Cambio visual distintivo en esmalte húmedo (segundo estadio ICDAS).",
  },
  3: {
    suggestions: [
      { code: "K02.0", label: "Caries limitada al esmalte" },
      { code: "K02.1", label: "Caries de la dentina" },
    ],
    clinicalNote:
      "Microcavitación / pérdida localizada del esmalte — posible compromiso dentinal.",
  },
  4: {
    suggestions: [{ code: "K02.1", label: "Caries de la dentina" }],
    clinicalNote: "Sombra oscura de dentina subyacente (cuarto estadio ICDAS).",
  },
  5: {
    suggestions: [{ code: "K02.1", label: "Caries de la dentina" }],
    clinicalNote: "Cavitación distintiva con dentina visible (quinto estadio ICDAS).",
  },
  6: {
    suggestions: [
      { code: "K02.1", label: "Caries de la dentina" },
      { code: "K02.5", label: "Caries dental con exposición pulpar" },
    ],
    clinicalNote:
      "Cavitación extensa con dentina visible — evaluar exposición pulpar (sexto estadio ICDAS).",
  },
};

// ---------------------------------------------------------------------------
// Función principal exportada
// ---------------------------------------------------------------------------

/**
 * Sugiere diagnósticos CIE-10 provisionales a partir de un puntaje ICDAS y
 * una referencia de diente (opcional).
 *
 * - El primer elemento del array es la sugerencia de mayor probabilidad.
 * - Todos los diagnósticos generados tienen `status: 'provisional'` y
 *   `source: 'odontogram'`.
 * - ICDAS 0 devuelve array vacío (sin lesión, sin diagnóstico de caries).
 *
 * @param icdas   Puntaje ICDAS de la superficie (0-6).
 * @param toothRef Referencia FDI del diente y cara donde se detectó la lesión.
 */
export function suggestCie10FromIcdas(
  icdas: ICDASScore,
  toothRef?: ToothRef,
): VisitDiagnosis[] {
  const entry = ICDAS_CIE10_MAP[icdas];
  if (!entry || entry.suggestions.length === 0) return [];

  return entry.suggestions.map(({ code, label }) => ({
    code,
    label,
    status: "provisional" as const,
    source: "odontogram" as const,
    ...(toothRef ? { toothRef } : {}),
  }));
}

/**
 * Devuelve la nota clínica descriptiva del estadio ICDAS dado.
 * Útil para mostrar contexto en la UI sin exponer el mapa interno.
 */
export function getIcdasClinicalNote(icdas: ICDASScore): string {
  return ICDAS_CIE10_MAP[icdas]?.clinicalNote ?? "";
}

/**
 * Devuelve el código CIE-10 principal (primera sugerencia) para un ICDAS dado,
 * o `null` si ICDAS es 0 (sano).
 */
export function getPrimaryIcdasCie10Code(icdas: ICDASScore): string | null {
  return ICDAS_CIE10_MAP[icdas]?.suggestions[0]?.code ?? null;
}
