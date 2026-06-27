import { useState, useMemo, useEffect } from "react";
import type {
  Tooth,
  ToothSurface,
  SurfaceDiagnosis,
  ProcedurePlan,
  ProcedureCatalogItem,
  ProcedureCategory,
  Currency,
  PulpalStatus,
  PatientRiskLevel,
} from "@/lib/odontogram/domain/odontogram/types";
import { PROCEDURE_CATALOG_MOCK } from "@/lib/odontogram/infrastructure/data/mock";
import {
  TreatmentSuggestionService,
  ProcedureFilterService,
  PlanCalculationService,
} from "@/lib/odontogram/domain/odontogram/services";

interface UsePlanTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  diagnoses?: Map<ToothSurface, SurfaceDiagnosis>;
  pulpalStatus?: PulpalStatus;
  initialPlans?: ProcedurePlan[];
  patientRisk?: PatientRiskLevel;
  procedureCatalog?: ProcedureCatalogItem[];
  onPlansChange?: (plans: ProcedurePlan[]) => void;
}

export function usePlanTab({
  tooth,
  selectedSurfaces,
  diagnoses,
  pulpalStatus = "normal",
  initialPlans,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  patientRisk = "medio",
  procedureCatalog,
  onPlansChange,
}: UsePlanTabProps) {
  const catalog = procedureCatalog ?? PROCEDURE_CATALOG_MOCK;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ProcedureCategory | "all"
  >("all");
  const [plans, setPlans] = useState<ProcedurePlan[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [exchangeRate] = useState(36.5);

  useEffect(() => {
    if (initialPlans && initialPlans.length > 0 && plans.length === 0) {
      setPlans(initialPlans);
      if (typeof window !== "undefined") {
        (window as unknown).__currentPlans = initialPlans;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlans]);

  const handlePlansUpdate = (newPlans: ProcedurePlan[]) => {
    setPlans(newPlans);
    if (typeof window !== "undefined") {
      (window as unknown).__currentPlans = newPlans;
    }
    if (onPlansChange) {
      onPlansChange(newPlans);
    }
  };

  const suggestions = useMemo(() => {
    return TreatmentSuggestionService.generateSuggestions(
      diagnoses,
      pulpalStatus,
      catalog,
    );
  }, [diagnoses, pulpalStatus, catalog]);

  const filteredCatalog = useMemo(() => {
    return ProcedureFilterService.filterCatalog(
      catalog,
      selectedCategory,
      searchQuery,
    );
  }, [searchQuery, selectedCategory, catalog]);

  const totals = useMemo(() => {
    return PlanCalculationService.calculateTotals(plans);
  }, [plans]);

  const addPlan = (procedureId: string, surfaces: ToothSurface[] = []) => {
    const procedure = catalog.find((p) => p.id === procedureId);
    if (!procedure) return;

    const newPlan: ProcedurePlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      toothNumber: tooth.number,
      surfaces: surfaces.length > 0 ? surfaces : selectedSurfaces,
      procedureId: procedure.id,
      displayName: procedure.name,
      category: procedure.category,
      status: "plan",
      priority: "media",
      durationMin: procedure.estimatedDuration,
      cost: procedure.baseCost,
      serviceSymbolText: procedure.serviceSymbolText,
      serviceSymbolUrl: procedure.serviceSymbolUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    handlePlansUpdate([...plans, newPlan]);
  };

  const removePlan = (planId: string) => {
    handlePlansUpdate(plans.filter((p) => p.id !== planId));
  };

  const updatePlan = (planId: string, updates: Partial<ProcedurePlan>) => {
    handlePlansUpdate(
      plans.map((p) =>
        p.id === planId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    plans,
    currency,
    setCurrency,
    exchangeRate,
    suggestions,
    filteredCatalog,
    totals,
    addPlan,
    removePlan,
    updatePlan,
  };
}
