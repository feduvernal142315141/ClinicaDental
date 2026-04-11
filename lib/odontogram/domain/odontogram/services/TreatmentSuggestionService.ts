import type {
  SurfaceDiagnosis,
  PulpalStatus,
  ToothSurface,
  ProcedureCatalogItem,
  ProcedureCategory,
} from "../types";

export interface TreatmentSuggestion {
  procedure: ProcedureCatalogItem;
  reason: string;
  surfaces: ToothSurface[];
  priority: "high" | "medium" | "low";
}

/**
 * Find a procedure in the catalog by category and optional name hint (fuzzy).
 * Falls back to any procedure in the category if name hint doesn't match.
 */
function findByIntent(
  catalog: ProcedureCatalogItem[],
  category: ProcedureCategory,
  nameHint?: string,
): ProcedureCatalogItem | undefined {
  const inCategory = catalog.filter((p) => p.category === category);
  if (inCategory.length === 0) return undefined;

  if (nameHint) {
    const lower = nameHint.toLowerCase();
    const byName = inCategory.find(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.aliases?.some((a) => a.toLowerCase().includes(lower)),
    );
    if (byName) return byName;
  }

  return inCategory[0];
}

export class TreatmentSuggestionService {
  static generateSuggestions(
    diagnoses: Map<ToothSurface, SurfaceDiagnosis> | undefined,
    pulpalStatus: PulpalStatus,
    procedureCatalog: ProcedureCatalogItem[],
  ): TreatmentSuggestion[] {
    const suggestions: TreatmentSuggestion[] = [];

    this.addPulpalStatusSuggestions(
      pulpalStatus,
      procedureCatalog,
      suggestions,
    );

    if (diagnoses) {
      this.addICDASSuggestions(diagnoses, procedureCatalog, suggestions);
    }

    return suggestions;
  }

  private static addPulpalStatusSuggestions(
    pulpalStatus: PulpalStatus,
    catalog: ProcedureCatalogItem[],
    suggestions: TreatmentSuggestion[],
  ): void {
    if (pulpalStatus === "irreversible" || pulpalStatus === "necrosis") {
      const endo = findByIntent(catalog, "endodoncia", "endodoncia");
      if (endo) {
        suggestions.push({
          procedure: endo,
          reason: `Estado pulpar ${pulpalStatus} detectado`,
          surfaces: [],
          priority: "high",
        });
      }

      const nucleo = findByIntent(catalog, "endodoncia", "núcleo");
      if (nucleo) {
        suggestions.push({
          procedure: nucleo,
          reason: "Recomendado después de endodoncia",
          surfaces: [],
          priority: "medium",
        });
      }

      const corona = findByIntent(catalog, "protesis", "corona");
      if (corona) {
        suggestions.push({
          procedure: corona,
          reason: "Protección post-endodoncia",
          surfaces: [],
          priority: "medium",
        });
      }
    }
  }

  private static addICDASSuggestions(
    diagnoses: Map<ToothSurface, SurfaceDiagnosis>,
    catalog: ProcedureCatalogItem[],
    suggestions: TreatmentSuggestion[],
  ): void {
    const diagnosesArray = Array.from(diagnoses.values());

    const incipient = diagnosesArray.filter(
      (d) => d.icdasScore >= 1 && d.icdasScore <= 2,
    );
    if (incipient.length > 0) {
      const oclusales = incipient.filter((d) => d.surface === "oclusal");
      if (oclusales.length > 0) {
        const sellante = findByIntent(catalog, "preventivo", "sellante");
        if (sellante) {
          suggestions.push({
            procedure: sellante,
            reason: "Caries incipiente ICDAS 1-2",
            surfaces: oclusales.map((d) => d.surface),
            priority: "medium",
          });
        }
      }

      const proximales = incipient.filter(
        (d) => d.surface === "mesial" || d.surface === "distal",
      );
      if (proximales.length > 0) {
        const infiltracion = findByIntent(
          catalog,
          "preventivo",
          "infiltración",
        );
        if (infiltracion) {
          suggestions.push({
            procedure: infiltracion,
            reason: "Caries proximal incipiente",
            surfaces: proximales.map((d) => d.surface),
            priority: "medium",
          });
        }
      }
    }

    const moderate = diagnosesArray.filter(
      (d) => d.icdasScore >= 3 && d.icdasScore <= 4,
    );
    if (moderate.length > 0) {
      const resina = findByIntent(catalog, "restaurador", "resina simple");
      if (resina) {
        suggestions.push({
          procedure: resina,
          reason: "Caries con microcavitación ICDAS 3-4",
          surfaces: moderate.map((d) => d.surface),
          priority: "high",
        });
      }
    }

    const severe = diagnosesArray.filter((d) => d.icdasScore >= 5);
    if (severe.length > 0) {
      const resinaCompleja = findByIntent(
        catalog,
        "restaurador",
        "resina compleja",
      );
      if (resinaCompleja) {
        suggestions.push({
          procedure: resinaCompleja,
          reason: "Caries con cavitación extensa ICDAS 5-6",
          surfaces: severe.map((d) => d.surface),
          priority: "high",
        });
      }

      if (severe.length >= 3) {
        const onlay = findByIntent(catalog, "restaurador", "onlay");
        if (onlay) {
          suggestions.push({
            procedure: onlay,
            reason: "Múltiples superficies afectadas",
            surfaces: severe.map((d) => d.surface),
            priority: "high",
          });
        }
      }
    }
  }
}
