import type { PatientVisitRecord, ToothRef } from "@/lib/entity/clinical-history";
import { TOOTH_NOTATION_CATALOG } from "@/lib/entity/settings/tooth-notations";
import type { ToothNotation } from "@/lib/odontogram/notation";

export type ToothPlainFormatter = (fdi: number) => string;

const NOTATION_LABEL: ReadonlyMap<ToothNotation, string> = new Map(
  TOOTH_NOTATION_CATALOG.map((entry) => [entry.value, entry.label]),
);

export function toothNotationLabel(notation: ToothNotation): string {
  return NOTATION_LABEL.get(notation) ?? notation;
}

export function notationDrawsBracket(notation: ToothNotation): boolean {
  return notation === "palmer";
}

export function toothPlainText(
  fdi: string | null | undefined,
  plain: ToothPlainFormatter,
): string | null {
  const raw = fdi?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? plain(parsed) : raw;
}

export function toothRefText(
  ref: ToothRef | null | undefined,
  plain: ToothPlainFormatter,
): string | null {
  const tooth = toothPlainText(ref?.fdi, plain);
  if (!tooth) return null;
  const surface = ref?.surface?.trim();
  return surface ? `${tooth} · ${surface}` : tooth;
}

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
