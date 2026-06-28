import type {
  SurfaceDiagnosis,
  ProcedurePlan,
  ProcedureCategory,
  PulpalStatus,
  ICDASScore,
} from "../types";

/**
 * ClinicalConsistencyService — valida la coherencia diagnóstico↔plan según el
 * camino ICCMS/ICDAS. Devuelve avisos NO bloqueantes (el clínico decide), para
 * evitar sobretratamiento (plan invasivo sin indicación) e infratratamiento
 * (lesión activa que requiere tratamiento sin plan).
 *
 * Evita falsos positivos: solo evalúa la indicación de caries para procedimientos
 * RESTAURADORES/ENDODÓNTICOS (no implante/cirugía, que tienen indicaciones
 * propias), exime cuando hay lesión NO cariosa (fractura/abrasión/erosión…) o
 * compromiso pulpar que justifican el tratamiento, y considera la ACTIVIDAD de
 * la lesión (una caries inactiva/arrestada en observación no exige plan).
 *
 * Fuente: ICDAS II / ICCMS™ management pathway.
 */

export interface ConsistencyWarning {
  level: "warn" | "info";
  message: string;
}

const RESTORATIVE_OR_ENDO: ProcedureCategory[] = ["restaurador", "endodoncia"];

function activeCariesDiagnoses(diagnoses: SurfaceDiagnosis[]): SurfaceDiagnosis[] {
  return diagnoses.filter(
    (d) =>
      d.cariesActivity !== "inactiva" &&
      d.cariesActivity !== "no-aplica" &&
      d.findingKind !== "non-carious-lesion",
  );
}

function maxIcdasOf(diagnoses: SurfaceDiagnosis[]): ICDASScore {
  return diagnoses.reduce<ICDASScore>(
    (max, d) => (d.icdasScore > max ? d.icdasScore : max),
    0,
  );
}

export class ClinicalConsistencyService {
  static check(params: {
    diagnoses: SurfaceDiagnosis[];
    plans: ProcedurePlan[];
    pulpalStatus?: PulpalStatus;
  }): ConsistencyWarning[] {
    const { diagnoses, plans, pulpalStatus } = params;
    const warnings: ConsistencyWarning[] = [];

    const activePlans = plans.filter((p) => p.status !== "canceled");
    const maxActiveCariesIcdas = maxIcdasOf(activeCariesDiagnoses(diagnoses));

    const hasRestorativeOrEndoPlan = activePlans.some((p) =>
      RESTORATIVE_OR_ENDO.includes(p.category),
    );
    const hasEndoPlan = activePlans.some((p) => p.category === "endodoncia");
    const hasSurgeryPlan = activePlans.some((p) => p.category === "cirugia");

    // ¿Hay indicación NO cariosa (fractura, abrasión, erosión, hipoplasia…) que
    // justifique una restauración aunque no haya caries?
    const hasNonCariousIndication = diagnoses.some(
      (d) =>
        (d.nonCariousLesions?.length ?? 0) > 0 ||
        (d.findingKind && d.findingKind !== "caries"),
    );

    // Cualquier pulpitis justifica intervención restauradora; solo irreversible/
    // necrosis requieren específicamente endodoncia (o exodoncia).
    const pulpJustifiesRestoration =
      pulpalStatus === "reversible" ||
      pulpalStatus === "irreversible" ||
      pulpalStatus === "necrosis";
    const pulpNeedsEndo =
      pulpalStatus === "irreversible" || pulpalStatus === "necrosis";

    // Sobretratamiento: plan restaurador/endo sin caries activa, sin lesión no
    // cariosa y sin compromiso pulpar que lo justifique.
    if (
      maxActiveCariesIcdas === 0 &&
      hasRestorativeOrEndoPlan &&
      !hasNonCariousIndication &&
      !pulpJustifiesRestoration
    ) {
      warnings.push({
        level: "warn",
        message:
          "Plan restaurador/endodóntico sin lesión que lo justifique (ICDAS 0, sin hallazgo no carioso ni compromiso pulpar): revisa la indicación.",
      });
    }

    // ICDAS 1-2 es reversible: preferir manejo no invasivo antes de restaurar.
    if (
      maxActiveCariesIcdas >= 1 &&
      maxActiveCariesIcdas <= 2 &&
      hasRestorativeOrEndoPlan &&
      !hasNonCariousIndication &&
      !pulpJustifiesRestoration
    ) {
      warnings.push({
        level: "info",
        message:
          "Lesión inicial (ICDAS 1-2), reversible: considera remineralización, sellante o infiltración (ICON) antes de restaurar.",
      });
    }

    // Infratratamiento: lesión cariosa activa que requiere tratamiento sin plan.
    if (maxActiveCariesIcdas >= 3 && activePlans.length === 0) {
      warnings.push({
        level: "warn",
        message: `Lesión activa ICDAS ${maxActiveCariesIcdas} sin plan de tratamiento.`,
      });
    }

    // Compromiso pulpar irreversible/necrosis sin endodoncia NI exodoncia.
    if (pulpNeedsEndo && !hasEndoPlan && !hasSurgeryPlan) {
      warnings.push({
        level: "warn",
        message:
          "Estado pulpar comprometido (irreversible/necrosis) sin plan de endodoncia ni exodoncia.",
      });
    }

    return warnings;
  }
}
