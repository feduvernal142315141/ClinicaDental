import type { ClinicalEvent, ICDASScore, PatientRiskLevel } from "../types";

/**
 * CariesRiskService — evaluación de riesgo de caries a nivel PACIENTE
 * (CAMBRA / ICCMS™ "lite").
 *
 * El riesgo de caries es una propiedad del paciente, no de un diente. Se estima
 * a partir de la CARGA y ACTIVIDAD de lesiones registradas en el odontograma
 * (ICDAS) y de la experiencia de caries reciente (tratamientos restauradores/
 * endodónticos en los últimos meses). Cuando haya datos de anamnesis (placa,
 * dieta, flúor, xerostomía, medicación), pueden pasarse en `extra` para refinar.
 *
 * Reglas clave (revisadas):
 * - Se cuenta por DIENTE (máximo ICDAS activo), no por superficie, para no
 *   sobreestimar lesiones multisuperficie (MOD = 1 lesión, no 3).
 * - Solo cuentan lesiones ACTIVAS y NO resueltas (excluye inactiva/no-aplica,
 *   y excluye diagnósticos en estado done/canceled = tratados/anulados).
 * - La experiencia restauradora se cuenta una vez por diente+procedimiento y con
 *   ventana temporal (caries reciente), no obturaciones antiguas de por vida.
 *
 * Fuentes: ICCMS™ Quick Reference (acffglobal), CAMBRA (Featherstone et al.).
 */

const RECENT_TREATMENT_MONTHS = 24;

export interface CariesRiskExtraFactors {
  poorHygiene?: boolean;
  highSugarDiet?: boolean;
  lowFluoride?: boolean;
  xerostomia?: boolean;
}

export interface CariesRiskResult {
  level: PatientRiskLevel;
  score: number;
  reasons: string[];
}

function eventIcdas(event: ClinicalEvent): ICDASScore {
  const raw =
    event.icdasScore ??
    event.severity ??
    event.diagnosisPayload?.surfaceDiagnosis?.icdasScore ??
    0;
  return (typeof raw === "number" ? raw : 0) as ICDASScore;
}

function isRecent(iso?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= RECENT_TREATMENT_MONTHS * 30 * 24 * 60 * 60 * 1000;
}

export class CariesRiskService {
  static assess(
    events: ClinicalEvent[] = [],
    extra: CariesRiskExtraFactors = {},
  ): CariesRiskResult {
    // 1) Lesión activa por DIENTE = máximo ICDAS activo no resuelto.
    const maxActiveByTooth = new Map<number, ICDASScore>();
    for (const ev of events) {
      if (ev.type !== "diagnosis") continue;
      if (ev.status === "canceled" || ev.status === "done") continue; // anulada o tratada
      const activity = ev.diagnosisPayload?.surfaceDiagnosis?.cariesActivity;
      if (activity === "inactiva" || activity === "no-aplica") continue;
      const icdas = eventIcdas(ev);
      if (icdas === 0) continue;
      const prev = maxActiveByTooth.get(ev.toothNumber) ?? 0;
      if (icdas > prev) maxActiveByTooth.set(ev.toothNumber, icdas);
    }

    let activeCavitated = 0; // dientes con ICDAS 5-6 activo
    let activeModerate = 0; // dientes con ICDAS 3-4 activo
    let initialLesions = 0; // dientes con ICDAS 1-2 activo
    for (const icdas of maxActiveByTooth.values()) {
      if (icdas >= 5) activeCavitated += 1;
      else if (icdas >= 3) activeModerate += 1;
      else initialLesions += 1;
    }

    // 2) Experiencia de caries reciente (restaurador/endo/prótesis), deduplicada
    //    por diente+procedimiento y con ventana temporal.
    const restorativeKeys = new Set<string>();
    for (const ev of events) {
      if (ev.status === "canceled") continue;
      const isDone = ev.type === "performed" || ev.status === "done";
      if (!isDone) continue;
      const cat = ev.category ?? "";
      const name = (ev.procedureName ?? "").toLowerCase();
      const restorative =
        cat === "restaurador" ||
        cat === "endodoncia" ||
        cat === "protesis" ||
        name.includes("restaur") ||
        name.includes("resina") ||
        name.includes("amalgama") ||
        name.includes("incrust") ||
        name.includes("corona") ||
        name.includes("endodon");
      if (!restorative) continue;
      if (!isRecent(ev.createdAt)) continue;
      restorativeKeys.add(`${ev.toothNumber}:${ev.procedureId ?? ev.id}`);
    }
    const restorativeHistory = restorativeKeys.size;

    const reasons: string[] = [];
    if (activeCavitated) reasons.push(`${activeCavitated} diente(s) con lesión cavitada activa (ICDAS 5-6)`);
    if (activeModerate) reasons.push(`${activeModerate} diente(s) con lesión activa moderada (ICDAS 3-4)`);
    if (initialLesions) reasons.push(`${initialLesions} diente(s) con lesión inicial (ICDAS 1-2)`);
    if (restorativeHistory) reasons.push(`${restorativeHistory} tratamiento(s) restaurador(es) reciente(s)`);
    if (extra.poorHygiene) reasons.push("Higiene deficiente / placa visible");
    if (extra.highSugarDiet) reasons.push("Dieta cariogénica");
    if (extra.lowFluoride) reasons.push("Exposición a flúor subóptima");
    if (extra.xerostomia) reasons.push("Xerostomía / hiposalivación");

    const extraRisk =
      (extra.poorHygiene ? 1 : 0) +
      (extra.highSugarDiet ? 1 : 0) +
      (extra.lowFluoride ? 1 : 0) +
      (extra.xerostomia ? 1 : 0);

    const score =
      activeCavitated * 3 +
      activeModerate * 2 +
      initialLesions * 1 +
      (restorativeHistory > 0 ? 1 : 0) +
      extraRisk;

    let level: PatientRiskLevel;
    if (
      activeCavitated >= 1 ||
      activeModerate >= 2 ||
      (activeModerate >= 1 && restorativeHistory >= 1) ||
      extraRisk >= 3
    ) {
      level = "alto";
    } else if (
      activeModerate >= 1 ||
      initialLesions >= 2 ||
      restorativeHistory >= 1 ||
      extraRisk >= 1
    ) {
      level = "medio";
    } else {
      level = "bajo";
    }

    if (reasons.length === 0) {
      reasons.push("Sin lesiones activas registradas");
    }

    return { level, score, reasons };
  }
}
