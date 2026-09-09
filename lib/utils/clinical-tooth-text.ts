/**
 * Texto de piezas dentales para la historia clínica: pantalla e impreso.
 *
 * Vive aquí —junto a `clinical-authorship`, el mismo tipo de ayudante— porque
 * la tarjeta de evolución y el documento impreso deben decir EXACTAMENTE lo
 * mismo: `formatPain` estaba duplicado LITERALMENTE en ambos, y dos copias de
 * un texto clínico son dos textos que acabarán divergiendo.
 *
 * `ToothRef.fdi` y `TreatmentPlanDiagnosisRef.toothFdi` llegan del backend como
 * STRING SIN VALIDAR: se convierten con guarda y, si no son número, se imprime
 * el valor crudo. Perder la referencia de una pieza en un documento que se
 * firma es peor que imprimirla fea.
 *
 * El formateador que se recibe es SIEMPRE la forma inequívoca
 * (`useToothLabel().plain`), nunca los dígitos: en Palmer «pieza 6» es ambiguo
 * entre cuatro piezas distintas.
 */
import type { PatientVisitRecord, ToothRef } from "@/lib/entity/clinical-history";
import { TOOTH_NOTATION_CATALOG } from "@/lib/entity/settings/tooth-notations";
import type { ToothNotation } from "@/lib/odontogram/notation";

/** Forma inequívoca de una pieza, ya ligada a la notación de la clínica. */
export type ToothPlainFormatter = (fdi: number) => string;

const NOTATION_LABEL: ReadonlyMap<ToothNotation, string> = new Map(
  TOOTH_NOTATION_CATALOG.map((entry) => [entry.value, entry.label]),
);

/**
 * Nombre de la nomenclatura vigente ("FDI / ISO 3950", "Palmer"…) para rótulos
 * y para la cabecera del impreso. Reutiliza el catálogo de "Opciones
 * Generales": no debe existir una segunda lista de nombres.
 */
export function toothNotationLabel(notation: ToothNotation): string {
  return NOTATION_LABEL.get(notation) ?? notation;
}

/**
 * Texto de una pieza a partir del `fdi` crudo del backend.
 * `null` si no hay referencia; el valor crudo si no es un número.
 */
export function toothPlainText(
  fdi: string | null | undefined,
  plain: ToothPlainFormatter,
): string | null {
  const raw = fdi?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? plain(parsed) : raw;
}

/** Pieza y cara: "16 · mesial" · "6 superior derecho · M". */
export function toothRefText(
  ref: ToothRef | null | undefined,
  plain: ToothPlainFormatter,
): string | null {
  const tooth = toothPlainText(ref?.fdi, plain);
  if (!tooth) return null;
  const surface = ref?.surface?.trim();
  return surface ? `${tooth} · ${surface}` : tooth;
}

/**
 * Resumen del dolor actual: "7/10 · punzante · 3 días · molar · pieza 16".
 * Única copia: la consumen la tarjeta de evolución y el impreso.
 */
export function formatPain(
  pain: PatientVisitRecord["currentPain"],
  plain: ToothPlainFormatter,
): string | null {
  if (!pain) return null;
  const parts: string[] = [];
  if (typeof pain.intensity === "number" && !Number.isNaN(pain.intensity)) {
    parts.push(`${pain.intensity}/10`);
  }
  if (pain.type?.trim()) parts.push(pain.type.trim());
  if (pain.duration?.trim()) parts.push(pain.duration.trim());
  if (pain.location?.trim()) parts.push(pain.location.trim());
  const tooth = toothPlainText(pain.toothRef?.fdi, plain);
  if (tooth) parts.push(`pieza ${tooth}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
