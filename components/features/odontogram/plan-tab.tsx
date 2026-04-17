"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Button as AntdButton } from "antd";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OdontogramInput, OdontogramSelect } from "@/components/odontogram/ui";
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Star,
  Package,
  CheckCircle2,
  Play,
} from "lucide-react";
import type {
  Tooth,
  ToothSurface,
  SurfaceDiagnosis,
  ProcedureCatalogItem,
  ProcedurePlan,
  ProcedureCategory,
  ProcedurePriority,
  Currency,
  PatientRiskLevel,
  PulpalStatus,
} from "./types";
import type { ClinicalEventStatus } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";
import {
  PROCEDURE_CATALOG,
  PROCEDURE_CATEGORIES,
  PROCEDURE_CATEGORY_COLORS,
  PLAN_STATUS_COLORS,
  PLAN_STATUS_LABELS,
  GLOBAL_STATUS_LABELS,
  PROCEDURE_TEMPLATES,
  TreatmentSuggestionService,
} from "./types";
import { useOdontogramServices } from "@/lib/odontogram/application/hooks/useOdontogramServices";

interface PlanTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  diagnoses?: Map<ToothSurface, SurfaceDiagnosis>;
  pulpalStatus?: PulpalStatus;
  initialPlans?: ProcedurePlan[];
  patientRisk?: PatientRiskLevel;
  onNavigateToTab?: (tab: string) => void;
  onPlansChange?: (plans: ProcedurePlan[]) => void;
  onSchedulePlans?: (plans: ProcedurePlan[]) => void;
}

function getToothTypeName(toothNumber: number): string {
  const lastDigit = toothNumber % 10;
  if (lastDigit === 1 || lastDigit === 2) return "Incisivo";
  if (lastDigit === 3) return "Canino";
  if (lastDigit === 4 || lastDigit === 5) return "Premolar";
  if (lastDigit === 6 || lastDigit === 7 || lastDigit === 8) return "Molar";
  return "Diente";
}

function generateId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function PlanTab({
  tooth,
  selectedSurfaces,
  diagnoses,
  pulpalStatus = "normal",
  initialPlans,
  patientRisk = "medio",
  onNavigateToTab,
  onPlansChange,
  onSchedulePlans,
}: PlanTabProps) {
  const { catalog: serviceCatalog } = useOdontogramServices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ProcedureCategory | "all"
  >("all");
  const [plans, setPlans] = useState<ProcedurePlan[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [exchangeRate] = useState(36.5);

  useEffect(() => {
    setPlans(initialPlans ?? []);
  }, [initialPlans]);

  const handlePlansUpdate = (newPlans: ProcedurePlan[]) => {
    setPlans(newPlans);

    if (onPlansChange) {
      onPlansChange(newPlans);
    }
  };

  // Generar sugerencias inteligentes basadas en diagnósticos
  const suggestions = useMemo(() => {
    return TreatmentSuggestionService.generateSuggestions(
      diagnoses,
      pulpalStatus,
      serviceCatalog,
    );
  }, [diagnoses, pulpalStatus, serviceCatalog]);

  // Filtrar catálogo
  const filteredCatalog = useMemo(() => {
    let filtered = serviceCatalog;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.aliases?.some((a: string) => a.toLowerCase().includes(query)) ||
          p.code?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory, serviceCatalog]);

  // Calcular totales
  const totals = useMemo(() => {
    const totalDuration = plans.reduce((sum, p) => sum + p.durationMin, 0);
    const totalCost = plans.reduce((sum, p) => sum + p.cost, 0);
    const byCategory = plans.reduce(
      (acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + p.cost;
        return acc;
      },
      {} as Record<ProcedureCategory, number>,
    );

    return { totalDuration, totalCost, byCategory };
  }, [plans]);

  const handleAddProcedure = (
    procedure: ProcedureCatalogItem,
    suggestedSurfaces?: ToothSurface[],
  ) => {
    const applicableSurfaces =
      suggestedSurfaces ||
      (procedure.compatibleSurfaces
        ? selectedSurfaces.filter((s) =>
            procedure.compatibleSurfaces?.includes(s),
          )
        : []);

    const newPlan: ProcedurePlan = {
      id: generateId(),
      toothNumber: tooth.number,
      surfaces:
        applicableSurfaces.length > 0 ? applicableSurfaces : selectedSurfaces,
      procedureId: procedure.id,
      displayName: procedure.name,
      category: procedure.category,
      status: "plan",
      priority: "media",
      material: procedure.materials?.[0],
      durationMin: procedure.estimatedDuration,
      cost: procedure.baseCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    handlePlansUpdate([...plans, newPlan]);
  };

  const handleRemovePlan = (planId: string) => {
    handlePlansUpdate(plans.filter((p) => p.id !== planId));
  };

  const handleUpdatePlan = (
    planId: string,
    updates: Partial<ProcedurePlan>,
  ) => {
    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : p,
    );

    handlePlansUpdate(updatedPlans);

    // Si se marca como "done", el tooth-modal creará el performed al guardar
    // Aquí solo actualizamos el estado local
  };

  const handleDuplicatePlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const newPlan: ProcedurePlan = {
        ...plan,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      handlePlansUpdate([...plans, newPlan]);
    }
  };

  const handleAddTemplate = (templateId: string) => {
    const template = PROCEDURE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const newPlans: ProcedurePlan[] = template.procedures
      .map((tp) => {
        const procedure =
          serviceCatalog.find((p) => p.id === tp.procedureId) ??
          PROCEDURE_CATALOG.find((p) => p.id === tp.procedureId);
        if (!procedure) return null;

        return {
          id: generateId(),
          toothNumber: tooth.number,
          surfaces: [],
          procedureId: procedure.id,
          displayName: procedure.name,
          category: procedure.category,
          status: "plan",
          priority: "media",
          material: procedure.materials?.[0],
          durationMin: procedure.estimatedDuration,
          cost: procedure.baseCost,
          dependencies: tp.dependsOn,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ProcedurePlan;
      })
      .filter(Boolean) as ProcedurePlan[];

    handlePlansUpdate([...plans, ...newPlans]);
  };

  const formatCurrency = (amount: number) => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`;
    }
    return `C$${(amount * exchangeRate).toFixed(2)}`;
  };

  const getRiskColor = (risk: PatientRiskLevel) => {
    if (risk === "bajo") return "bg-green-100 text-green-800 border-green-300";
    if (risk === "medio") return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const hasCoherenceIssue =
    (tooth.globalStatus === "absent" || tooth.globalStatus === "implant") &&
    plans.some((p) => p.category === "restaurador");

  if (selectedSurfaces.length === 0 && !diagnoses) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Selecciona superficies o completa el diagnóstico primero
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => onNavigateToTab?.("superficies")}
          >
            ← Superficies
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateToTab?.("diagnostico")}
          >
            ← Diagnóstico
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {/* Header compacto */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">Plan · Diente {tooth.number}</h3>
          <p className="text-sm text-muted-foreground">
            {getToothTypeName(tooth.number)} · {selectedSurfaces.length}{" "}
            superficie
            {selectedSurfaces.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={getRiskColor(patientRisk)}>
            Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {GLOBAL_STATUS_LABELS[tooth.globalStatus]}
          </Badge>
          <OdontogramSelect
            value={currency}
            onChange={(v) => setCurrency(v as Currency)}
            options={[
              { value: "USD", label: "USD" },
              { value: "NIO", label: "NIO" },
            ]}
            style={{ width: 96 }}
          />
        </div>
      </div>

      {hasCoherenceIssue && (
        <Card className="p-3 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Revisa el estado del diente
              </p>
              <p className="text-xs text-red-700">
                El diente está marcado como{" "}
                {GLOBAL_STATUS_LABELS[tooth.globalStatus]} pero tienes
                procedimientos restauradores planificados
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Panel principal: dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        {/* Columna izquierda: Catálogo & Sugerencias */}
        <div className="space-y-4">
          {/* Sugerencias inteligentes */}
          {suggestions.length > 0 && (
            <Card className="p-4 shadow-sm">
              <Label className="text-sm font-semibold mb-3 block">
                Sugerencias inteligentes
              </Label>
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      borderColor:
                        PROCEDURE_CATEGORY_COLORS[
                          suggestion.procedure.category
                        ],
                      backgroundColor: `${PROCEDURE_CATEGORY_COLORS[suggestion.procedure.category]}10`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {suggestion.procedure.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.reason}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor:
                            PROCEDURE_CATEGORY_COLORS[
                              suggestion.procedure.category
                            ],
                          color:
                            PROCEDURE_CATEGORY_COLORS[
                              suggestion.procedure.category
                            ],
                        }}
                      >
                        {PROCEDURE_CATEGORIES[suggestion.procedure.category]}
                      </Badge>
                    </div>
                    {suggestion.surfaces.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {suggestion.surfaces.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">
                            {s.charAt(0).toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {suggestion.procedure.estimatedDuration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(suggestion.procedure.baseCost)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() =>
                          handleAddProcedure(
                            suggestion.procedure,
                            suggestion.surfaces,
                          )
                        }
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Añadir
                      </Button>
                      {selectedSurfaces.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs bg-transparent"
                          onClick={() =>
                            handleAddProcedure(
                              suggestion.procedure,
                              selectedSurfaces,
                            )
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />A todas
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Plantillas */}
          {PROCEDURE_TEMPLATES.length > 0 && (
            <Card className="p-4 shadow-sm">
              <Label className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Package className="w-4 h-4" />
                Plantillas
              </Label>
              <div className="space-y-2">
                {PROCEDURE_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <p className="text-sm font-medium mb-1">{template.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs bg-transparent"
                      onClick={() => handleAddTemplate(template.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Añadir plantilla
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Buscador y catálogo */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Catálogo de procedimientos
            </Label>

            {/* Buscador */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <OdontogramInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar procedimiento..."
                className="pl-9 text-sm"
              />
            </div>

            {/* Chips de categorías */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedCategory("all")}
              >
                Todos
              </Badge>
              {(
                Object.entries(PROCEDURE_CATEGORIES) as [
                  ProcedureCategory,
                  string,
                ][]
              ).map(([cat, label]) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  style={
                    selectedCategory === cat
                      ? {
                          backgroundColor: PROCEDURE_CATEGORY_COLORS[cat],
                          borderColor: PROCEDURE_CATEGORY_COLORS[cat],
                        }
                      : {
                          borderColor: PROCEDURE_CATEGORY_COLORS[cat],
                          color: PROCEDURE_CATEGORY_COLORS[cat],
                        }
                  }
                  onClick={() => setSelectedCategory(cat)}
                >
                  {label}
                </Badge>
              ))}
            </div>

            {/* Lista de procedimientos */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCatalog.map((procedure) => (
                <div
                  key={procedure.id}
                  className="p-2 rounded border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{procedure.name}</p>
                      {procedure.description && (
                        <p className="text-xs text-muted-foreground">
                          {procedure.description}
                        </p>
                      )}
                    </div>
                    {procedure.isFavorite && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {procedure.estimatedDuration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(procedure.baseCost)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs bg-transparent"
                      onClick={() => handleAddProcedure(procedure)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Añadir
                    </Button>
                    {selectedSurfaces.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs bg-transparent"
                        onClick={() =>
                          handleAddProcedure(procedure, selectedSurfaces)
                        }
                      >
                        <Plus className="w-3 h-3 mr-1" />A todas
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Columna derecha: Plan actual */}
        <div className="space-y-4">
          <Card className="p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold">
                Plan actual ({plans.length})
              </Label>
              {plans.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePlansUpdate([])}
                  className="text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Limpiar todo
                </Button>
              )}
            </div>

            {plans.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm">No hay procedimientos en el plan</p>
                <p className="text-xs mt-1">
                  Añade procedimientos desde el catálogo o sugerencias
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="shadow-sm border-2 overflow-hidden"
                    style={{
                      borderColor: PLAN_STATUS_COLORS[plan.status],
                      backgroundColor: `${PLAN_STATUS_COLORS[plan.status]}08`,
                    }}
                  >
                    <CardHeader className="p-3 pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm font-medium text-foreground">
                            {plan.displayName}
                          </CardTitle>
                          {plan.surfaces.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {plan.surfaces.map((s) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {s.charAt(0).toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {plan.status === "done" && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs text-blue-700 font-medium">
                                Movido a Realizado
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 bg-background/50 hover:bg-background"
                            onClick={() => handleDuplicatePlan(plan.id)}
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 bg-background/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            onClick={() => handleRemovePlan(plan.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                          <OdontogramSelect
                            value={plan.status}
                            onChange={(v) =>
                              handleUpdatePlan(plan.id, {
                                status: v as ClinicalEventStatus,
                              })
                            }
                            options={(
                              Object.entries(PLAN_STATUS_LABELS) as [
                                ClinicalEventStatus,
                                string,
                              ][]
                            ).map(([status, label]) => ({
                              value: status,
                              label,
                            }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Prioridad</Label>
                          <OdontogramSelect
                            value={plan.priority}
                            onChange={(v) =>
                              handleUpdatePlan(plan.id, {
                                priority: v as ProcedurePriority,
                              })
                            }
                            options={[
                              { value: "alta", label: "Alta" },
                              { value: "media", label: "Media" },
                              { value: "baja", label: "Baja" },
                            ]}
                          />
                        </div>
                      </div>

                      {plan.material && (
                        <div className="mb-3 space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Material</Label>
                          <OdontogramInput
                            value={plan.material}
                            onChange={(e) =>
                              handleUpdatePlan(plan.id, {
                                material: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Tiempo (min)
                          </Label>
                          <OdontogramInput
                            type="number"
                            value={String(plan.durationMin)}
                            onChange={(e) =>
                              handleUpdatePlan(plan.id, {
                                durationMin: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Costo</Label>
                          <OdontogramInput
                            type="number"
                            value={String(plan.cost)}
                            onChange={(e) =>
                              handleUpdatePlan(plan.id, {
                                cost: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
                        <OdontogramInput
                          value={plan.notes || ""}
                          onChange={(e) =>
                            handleUpdatePlan(plan.id, {
                              notes: e.target.value,
                            })
                          }
                          placeholder="Observaciones..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </CardContent>
                    {plan.dependencies && plan.dependencies.length > 0 && (
                      <div className="px-3 pb-3 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span className="text-xs text-amber-700">
                          Depende de otros procedimientos
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Totales */}
          {plans.length > 0 && (
            <Card className="p-4 shadow-sm bg-muted/30">
              <Label className="text-sm font-semibold mb-3 block">
                Totales
              </Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Tiempo total
                  </span>
                  <span className="text-sm font-medium">
                    {totals.totalDuration} min (
                    {Math.ceil(totals.totalDuration / 60)} sesiones aprox.)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Costo total
                  </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totals.totalCost)}
                  </span>
                </div>

                {Object.keys(totals.byCategory).length > 0 && (
                  <div className="pt-2 border-t">
                    <Label className="text-xs mb-2 block">Por categoría</Label>
                    <div className="space-y-1">
                      {(
                        Object.entries(totals.byCategory) as [
                          ProcedureCategory,
                          number,
                        ][]
                      ).map(([cat, cost]) => (
                        <div
                          key={cat}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: PROCEDURE_CATEGORY_COLORS[cat],
                              }}
                            />
                            {PROCEDURE_CATEGORIES[cat]}
                          </span>
                          <span>{formatCurrency(cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <AntdButton
                  type="default"
                  style={{ flex: 1 }}
                  onClick={() => onSchedulePlans?.(plans)}
                  icon={<Calendar className="w-4 h-4" />}
                >
                  Programar
                </AntdButton>
                <AntdButton
                  type="primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const now = new Date().toISOString();
                    const updatedPlans = plans.map((p) =>
                      p.status !== "done" && p.status !== "canceled"
                        ? {
                            ...p,
                            status: "done" as ClinicalEventStatus,
                            appointmentAt: now,
                            updatedAt: now,
                          }
                        : p,
                    );
                    handlePlansUpdate(updatedPlans);
                  }}
                  icon={<Play className="w-4 h-4" />}
                >
                  Realizar ahora
                </AntdButton>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
