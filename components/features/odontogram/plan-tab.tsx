"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Label,
  StatusBadge,
} from "@/components/ui";
import {
  ODONTOGRAM_FIELD_LABEL_CLASS,
  OdontogramButton,
  OdontogramEmptyState,
  OdontogramField,
  OdontogramInput,
  OdontogramSelect,
  RISK_TONE,
} from "@/components/odontogram/ui";
import { cn } from "@/lib/utils/utils";
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Calendar,
  Clock,
  AlertCircle,
  Star,
  Package,
  CheckCircle2,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import type {
  Tooth,
  ToothSurface,
  SurfaceDiagnosis,
  ProcedureCatalogItem,
  ProcedurePlan,
  ProcedureCategory,
  ProcedurePriority,
  PatientRiskLevel,
  PulpalStatus,
} from "./types";
import type { ClinicalEventStatus } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";
import {
  PROCEDURE_CATALOG,
  PROCEDURE_CATEGORIES,
  PROCEDURE_CATEGORY_COLORS,
  PLAN_STATUS_LABELS,
  GLOBAL_STATUS_LABELS,
  PROCEDURE_TEMPLATES,
  TreatmentSuggestionService,
  ClinicalConsistencyService,
  ToothTypeService,
  projectToCanonicalSurface,
  summarizeCanonicalSurfaces,
  toIcdasSurfaceFilter,
} from "./types";
import { useOdontogramStore } from "@/lib/odontogram/store";
import {
  formatClinicCurrencyExact,
  getClinicCurrencySymbol,
} from "@/lib/utils/clinic-regional-format";
import { useOdontogramServices } from "@/lib/odontogram/application/hooks/useOdontogramServices";
import { useIcdasTemplateSuggestions } from "@/lib/odontogram/application/hooks/useIcdasTemplateSuggestions";
import { isToothPhysicallyAbsent } from "@/lib/odontogram/domain/odontogram/constants/tooth-status.constants";

interface PlanTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  diagnoses?: Map<ToothSurface, SurfaceDiagnosis>;
  pulpalStatus?: PulpalStatus;
  initialPlans?: ProcedurePlan[];
  patientRisk?: PatientRiskLevel;
  patientRiskReasons?: string[];
  onNavigateToTab?: (tab: string) => void;
  onPlansChange?: (plans: ProcedurePlan[]) => void;
  onSchedulePlans?: (plans: ProcedurePlan[]) => void;
}

function generateId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estado del plan → borde y tinte de la ficha, en clases del sistema.
 *
 * Sustituye al hex crudo de `PLAN_STATUS_COLORS` pintado por `style`: aquel
 * borde era un color pensado para tema claro y su relleno al 2,4% (`…06`) era
 * literalmente invisible sobre el lienzo oscuro. El hex sigue siendo dato de
 * dominio (lo usa el renderizado del diente), pero ya no pinta esta tarjeta.
 * Los tonos son la traducción 1:1 de aquellos hex a la paleta Tailwind
 * (`#F59E0B`→amber, `#F97316`→orange, `#8B5CF6`→violet, `#3B82F6`→sky,
 * `#94A3B8`/`#6B7280`→neutro), con la receta dual-tema del proyecto.
 */
const PLAN_STATUS_CARD_CLASS: Record<ClinicalEventStatus, string> = {
  open: "border-hairline bg-elevated",
  plan: "border-amber-400/25 bg-amber-500/5",
  scheduled: "border-orange-400/25 bg-orange-500/5",
  in_progress: "border-violet-400/25 bg-violet-500/5",
  done: "border-sky-400/25 bg-sky-500/5",
  canceled: "border-hairline bg-hover",
  observation: "border-orange-400/25 bg-orange-500/5",
};

interface SidebarPanelProps {
  /** Icono del encabezado (`lucide-react`, ya con sus clases). */
  icon: ReactNode;
  title: ReactNode;
  /** Si se pasa, el encabezado es plegable (botón + chevron). */
  collapsible?: { open: boolean; onToggle: () => void };
  children: ReactNode;
}

/**
 * Panel de la barra lateral: tarjeta + micro-label con icono.
 *
 * LOCAL a propósito: sus cuatro consumidores (sugerencias, plantillas ICDAS,
 * plantillas y catálogo) viven en este mismo fichero. No lo saques a
 * `components/ui` mientras no exista un quinto consumidor fuera de aquí.
 */
function SidebarPanel({
  icon,
  title,
  collapsible,
  children,
}: SidebarPanelProps) {
  const label = (
    <Label
      className={cn(
        ODONTOGRAM_FIELD_LABEL_CLASS,
        collapsible ? "cursor-pointer" : "mb-2 block",
      )}
    >
      {icon}
      {title}
    </Label>
  );

  return (
    <Card className="p-3 shadow-sm">
      {collapsible ? (
        <button
          type="button"
          className="w-full flex items-center justify-between text-left"
          onClick={collapsible.onToggle}
        >
          {label}
          {collapsible.open ? (
            <ChevronUp className="w-4 h-4 text-subtle" />
          ) : (
            <ChevronDown className="w-4 h-4 text-subtle" />
          )}
        </button>
      ) : (
        label
      )}
      {children}
    </Card>
  );
}

interface PickerRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleClassName?: string;
  /** Punto de identidad de categoría (el hex SÍ es información aquí). */
  accentColor?: string;
  /** Adorno tras el título (p. ej. la estrella de favorito). */
  titleAdornment?: ReactNode;
  /** Valor alineado a la derecha (p. ej. el costo). */
  trailing?: ReactNode;
  onClick: () => void;
}

/**
 * Fila pulsable de la barra lateral: icono «+», título, subtítulo y valor.
 *
 * LOCAL a propósito: unifica las tres copias que había en este fichero
 * (sugerencias, plantillas y catálogo), que solo se diferenciaban en el borde
 * y el hover. Mismo criterio que `SidebarPanel`: sin consumidor externo, no
 * es un átomo del sistema.
 */
function PickerRow({
  title,
  subtitle,
  subtitleClassName,
  accentColor,
  titleAdornment,
  trailing,
  onClick,
}: PickerRowProps) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded-md border border-hairline bg-elevated hover:bg-hover transition-colors cursor-pointer"
      onClick={onClick}
    >
      <Plus className="w-3.5 h-3.5 shrink-0 text-subtle" />
      {accentColor && (
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium truncate">{title}</p>
          {titleAdornment}
        </div>
        {subtitle != null && (
          <p
            className={cn(
              "text-[10px] text-subtle truncate",
              subtitleClassName,
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {trailing != null && (
        <span className="text-xs font-semibold whitespace-nowrap tabular-nums">
          {trailing}
        </span>
      )}
    </div>
  );
}

export function PlanTab({
  tooth,
  selectedSurfaces,
  diagnoses,
  pulpalStatus = "normal",
  initialPlans,
  patientRisk = "medio",
  patientRiskReasons,
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
  const [icdasSectionOpen, setIcdasSectionOpen] = useState(true);
  // Fichas de plan desplegadas para edición. Vive aquí, con el resto de hooks:
  // declararlo tras el return temprano de "sin superficies" lo convertía en un
  // hook condicional y rompía React al alternar entre ambos estados.
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  // Moneda de la clínica inyectada por el host en el store (solo presentación).
  const currency = useOdontogramStore((state) => state.currency);

  // Derive the highest ICDAS score and primary surface from diagnoses
  const { maxIcdasScore, primarySurfaceFilter } = useMemo(() => {
    if (!diagnoses || diagnoses.size === 0)
      return { maxIcdasScore: null, primarySurfaceFilter: null };
    let max = -1;
    let surface: ToothSurface | null = null;
    diagnoses.forEach((diag, surf) => {
      if (diag.icdasScore > max) {
        max = diag.icdasScore;
        surface = surf;
      }
    });
    // El backend filtra por FAMILIA (`proximal | oclusal | facial | lingual`),
    // no por celda: mandarle el código crudo hacía que las reglas "proximal" no
    // casaran NUNCA ("mesial" ≠ "proximal"), y tras el desdoble por vista
    // fallarían también las demás ("mesialVestibular" ≠ nada). Esta traducción
    // en el cliente es la garantía; el normalizador del handler es tolerancia.
    return {
      maxIcdasScore: max >= 0 ? max : null,
      primarySurfaceFilter: surface ? toIcdasSurfaceFilter(surface) : null,
    };
  }, [diagnoses]);

  const { suggestions: icdasTemplateSuggestions, loading: icdasLoading } =
    useIcdasTemplateSuggestions(maxIcdasScore, primarySurfaceFilter);

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
    // El catálogo declara compatibilidad en vocabulario CANÓNICO ADA ("mesial"),
    // no por celda de vista: hay que PROYECTAR la celda marcada antes de
    // comparar. Sin esto ningún procedimiento casaría con `mesialVestibular` y
    // el plan se crearía sobre las caras equivocadas sin avisar.
    const applicableSurfaces =
      suggestedSurfaces ||
      (procedure.compatibleSurfaces
        ? selectedSurfaces.filter((s) =>
            procedure.compatibleSurfaces?.includes(
              projectToCanonicalSurface(s),
            ),
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
      serviceSymbolText: procedure.serviceSymbolText,
      serviceSymbolUrl: procedure.serviceSymbolUrl,
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
          serviceSymbolText: procedure.serviceSymbolText,
          serviceSymbolUrl: procedure.serviceSymbolUrl,
          dependencies: tp.dependsOn,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ProcedurePlan;
      })
      .filter(Boolean) as ProcedurePlan[];

    handlePlansUpdate([...plans, ...newPlans]);
  };

  // Apply all items from an ICDAS-based backend template suggestion
  const handleApplyIcdasTemplate = (
    templateName: string,
    itemServiceIds: string[],
  ) => {
    const newPlans: ProcedurePlan[] = itemServiceIds
      .map((serviceId) => {
        const procedure = serviceCatalog.find((p) => p.id === serviceId);
        if (!procedure) return null;
        return {
          id: generateId(),
          toothNumber: tooth.number,
          surfaces: selectedSurfaces,
          procedureId: procedure.id,
          displayName: procedure.name,
          category: procedure.category,
          status: "plan" as const,
          priority: "media" as const,
          durationMin: procedure.estimatedDuration,
          cost: procedure.baseCost,
          serviceSymbolText: procedure.serviceSymbolText,
          serviceSymbolUrl: procedure.serviceSymbolUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ProcedurePlan;
      })
      .filter(Boolean) as ProcedurePlan[];

    handlePlansUpdate([...plans, ...newPlans]);
  };

  const formatCurrency = (amount: number) =>
    formatClinicCurrencyExact(amount, currency);

  const hasCoherenceIssue =
    isToothPhysicallyAbsent(tooth.globalStatus) &&
    plans.some((p) => p.category === "restaurador");

  // Avisos de coherencia diagnóstico↔plan según ICCMS/ICDAS (no bloqueantes).
  const consistencyWarnings = useMemo(
    () =>
      ClinicalConsistencyService.check({
        diagnoses: diagnoses ? Array.from(diagnoses.values()) : [],
        plans,
        pulpalStatus,
      }),
    [diagnoses, plans, pulpalStatus],
  );

  if (selectedSurfaces.length === 0 && !diagnoses) {
    return (
      <Card className="p-8 text-center">
        <p className="text-subtle mb-4">
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
    <div className="space-y-3 h-full">
      {/* Compact inline header - only risk + status since tooth info is in modal header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-subtle">
            {plans.length} procedimiento{plans.length !== 1 ? "s" : ""}
          </span>
          {plans.length > 0 && (
            <span className="text-xs text-subtle tabular-nums">
              · {totals.totalDuration} min · {formatCurrency(totals.totalCost)}
            </span>
          )}
        </div>
        <StatusBadge
          tone={RISK_TONE[patientRisk]}
          title={patientRiskReasons?.join(" · ")}
        >
          Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
        </StatusBadge>
      </div>

      {hasCoherenceIssue && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>
            El diente está marcado como{" "}
            {GLOBAL_STATUS_LABELS[tooth.globalStatus]} pero tienes procedimientos
            restauradores planificados.
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos de coherencia diagnóstico↔plan (ICCMS/ICDAS), no bloqueantes */}
      {consistencyWarnings.length > 0 && (
        <div className="space-y-1.5">
          {/* Clave por mensaje y NO `live`: son contenido derivado permanente
              del par diagnóstico↔plan, no eventos. Con `key={i}` y región live,
              al resolverse un aviso del medio React reutiliza el nodo y le
              cambia el texto, y el lector de pantalla anuncia de forma
              assertive un aviso que el usuario ya tenía delante mientras el que
              de verdad se resolvió desaparece en silencio. */}
          {consistencyWarnings.map((w) => (
            <Alert
              key={w.message}
              live={false}
              variant={w.level === "warn" ? "warning" : "info"}
            >
              <AlertCircle />
              <AlertDescription>{w.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main 2-column layout — Plan primary (left), Suggestions sidebar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* === LEFT COLUMN: Plan actual (PRIMARY) === */}
        <div className="space-y-3">
          <Card className="p-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">
                Plan actual
              </Label>
              {plans.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePlansUpdate([])}
                  className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            {plans.length === 0 ? (
              <OdontogramEmptyState
                icon={Package}
                description="Sin procedimientos"
                hint="Añade desde las sugerencias o el catálogo →"
              />
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => {
                  const isExpanded = expandedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "rounded-lg border overflow-hidden transition-all",
                        PLAN_STATUS_CARD_CLASS[plan.status],
                      )}
                    >
                      {/* Compact row — always visible */}
                      <div
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-hover transition-colors"
                        onClick={() =>
                          setExpandedPlanId(isExpanded ? null : plan.id)
                        }
                      >
                        {/* Color indicator */}
                        <div
                          className="w-1 h-8 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              PROCEDURE_CATEGORY_COLORS[plan.category],
                          }}
                        />
                        {/* Name + surfaces */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {plan.displayName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {plan.surfaces.length > 0 && (
                              // El chip muestra el resumen CANÓNICO ("MOD"),
                              // que es como un odontólogo lee una restauración
                              // continua; el detalle por celda va en el título.
                              // Listar las 5 celdas de una MOD aquí sería
                              // ilegible y además diría "5 superficies".
                              <span
                                className="text-[10px] text-subtle"
                                title={plan.surfaces
                                  .map(
                                    (s) =>
                                      ToothTypeService.getSurfaceLabel(
                                        plan.toothNumber,
                                        s,
                                      ).short,
                                  )
                                  .join(", ")}
                              >
                                {summarizeCanonicalSurfaces(
                                  plan.toothNumber,
                                  plan.surfaces,
                                )}
                              </span>
                            )}
                            {plan.status === "done" && (
                              <span className="flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-300">
                                <CheckCircle2 className="w-3 h-3" />
                                Realizado
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Price + actions */}
                        <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
                          {formatCurrency(plan.cost)}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            className="p-1 rounded hover:bg-hover transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicatePlan(plan.id);
                            }}
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5 text-subtle" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-rose-500/10 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePlan(plan.id);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300" />
                          </button>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-subtle shrink-0 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      {/* Expanded details — edit fields */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-hairline bg-hover space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <OdontogramField label="Estado">
                              {(control) => (
                                <OdontogramSelect
                                  {...control}
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
                              )}
                            </OdontogramField>
                            <OdontogramField label="Prioridad">
                              {(control) => (
                                <OdontogramSelect
                                  {...control}
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
                              )}
                            </OdontogramField>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <OdontogramField
                              label="Tiempo (min)"
                              htmlFor={`${plan.id}-duration`}
                            >
                              <OdontogramInput
                                id={`${plan.id}-duration`}
                                type="number"
                                value={String(plan.durationMin)}
                                onChange={(e) =>
                                  handleUpdatePlan(plan.id, {
                                    durationMin: Number(e.target.value),
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </OdontogramField>
                            <OdontogramField
                              label={`Costo (${getClinicCurrencySymbol(currency)})`}
                              htmlFor={`${plan.id}-cost`}
                            >
                              <OdontogramInput
                                id={`${plan.id}-cost`}
                                type="number"
                                value={String(plan.cost)}
                                onChange={(e) =>
                                  handleUpdatePlan(plan.id, {
                                    cost: Number(e.target.value),
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </OdontogramField>
                          </div>

                          {plan.material && (
                            <OdontogramField
                              label="Material"
                              htmlFor={`${plan.id}-material`}
                            >
                              <OdontogramInput
                                id={`${plan.id}-material`}
                                value={plan.material}
                                onChange={(e) =>
                                  handleUpdatePlan(plan.id, {
                                    material: e.target.value,
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </OdontogramField>
                          )}

                          <OdontogramField
                            label="Notas"
                            htmlFor={`${plan.id}-notes`}
                          >
                            <OdontogramInput
                              id={`${plan.id}-notes`}
                              value={plan.notes || ""}
                              onChange={(e) =>
                                handleUpdatePlan(plan.id, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Observaciones..."
                              className="h-7 text-xs"
                            />
                          </OdontogramField>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Sticky totals bar */}
          {plans.length > 0 && (
            <div className="sticky bottom-0 z-10">
              <Card className="p-3 shadow-lg bg-surface/95 backdrop-blur-sm border-t-2 border-brand/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm text-subtle tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      {totals.totalDuration} min
                    </span>
                    {Object.keys(totals.byCategory).length > 0 && (
                      <div className="hidden sm:flex gap-3">
                        {(
                          Object.entries(totals.byCategory) as [
                            ProcedureCategory,
                            number,
                          ][]
                        ).map(([cat, cost]) => (
                          <span
                            key={cat}
                            className="flex items-center gap-1 text-xs text-subtle tabular-nums"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  PROCEDURE_CATEGORY_COLORS[cat],
                              }}
                            />
                            {formatCurrency(cost)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {formatCurrency(totals.totalCost)}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <OdontogramButton
                    variant="outline"
                    className="flex-1"
                    onClick={() => onSchedulePlans?.(plans)}
                    icon={<Calendar className="w-4 h-4" />}
                  >
                    Programar
                  </OdontogramButton>
                  <OdontogramButton
                    variant="primary"
                    className="flex-1"
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
                  </OdontogramButton>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* === RIGHT COLUMN: Suggestions + Catalog sidebar === */}
        <div className="space-y-3 lg:max-h-[min(500px,calc(100vh-340px))] lg:overflow-y-auto lg:pr-1.5">
          {/* Smart suggestions */}
          {suggestions.length > 0 && (
            <SidebarPanel
              icon={<Sparkles className="w-3 h-3 inline mr-1" />}
              title="Sugerencias inteligentes"
            >
              <div className="space-y-1.5">
                {suggestions.map((suggestion, idx) => (
                  <PickerRow
                    key={idx}
                    accentColor={
                      PROCEDURE_CATEGORY_COLORS[suggestion.procedure.category]
                    }
                    title={suggestion.procedure.name}
                    subtitle={suggestion.reason}
                    trailing={formatCurrency(suggestion.procedure.baseCost)}
                    onClick={() =>
                      handleAddProcedure(
                        suggestion.procedure,
                        suggestion.surfaces,
                      )
                    }
                  />
                ))}
              </div>
            </SidebarPanel>
          )}

          {/* ICDAS template suggestions */}
          {maxIcdasScore !== null && (
            <SidebarPanel
              icon={
                <Sparkles className="w-3 h-3 inline mr-1 text-amber-700 dark:text-amber-300" />
              }
              title={`Plantillas ICDAS · ${maxIcdasScore}`}
              collapsible={{
                open: icdasSectionOpen,
                onToggle: () => setIcdasSectionOpen(!icdasSectionOpen),
              }}
            >
              {icdasSectionOpen && (
                <div className="space-y-1.5 mt-2">
                  {icdasLoading && (
                    <p className="text-xs text-subtle py-2">Cargando…</p>
                  )}
                  {!icdasLoading && icdasTemplateSuggestions.length === 0 && (
                    <p className="text-xs text-subtle py-1">
                      Sin plantillas para ICDAS {maxIcdasScore}.
                    </p>
                  )}
                  {icdasTemplateSuggestions.map((suggestion) => {
                    return (
                      <div
                        key={suggestion.templateId}
                        className="p-2 rounded-md border border-amber-400/25 bg-amber-500/15"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">
                            {suggestion.templateName}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-400/25 text-amber-700 dark:text-amber-300"
                          >
                            P{suggestion.priority}
                          </Badge>
                        </div>
                        {suggestion.templateDescription && (
                          <p className="text-[10px] text-subtle mb-1.5">
                            {suggestion.templateDescription}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {suggestion.items
                            .sort((a, b) => a.itemOrder - b.itemOrder)
                            .map((item, idx) => {
                              const svc = serviceCatalog.find(
                                (s) => s.id === item.serviceId,
                              );
                              return (
                                <Badge
                                  key={item.id}
                                  variant="outline"
                                  className="text-[10px] px-1.5"
                                >
                                  {idx + 1}.{" "}
                                  {svc?.name ?? item.serviceId.slice(0, 8)}
                                </Badge>
                              );
                            })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7 border-amber-400/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 bg-transparent"
                          onClick={() =>
                            handleApplyIcdasTemplate(
                              suggestion.templateName,
                              suggestion.items
                                .sort((a, b) => a.itemOrder - b.itemOrder)
                                .map((i) => i.serviceId),
                            )
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Aplicar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </SidebarPanel>
          )}

          {/* Pre-built templates */}
          {PROCEDURE_TEMPLATES.length > 0 && (
            <SidebarPanel
              icon={<Package className="w-3 h-3 inline mr-1" />}
              title="Plantillas"
            >
              <div className="space-y-1.5">
                {PROCEDURE_TEMPLATES.map((template) => (
                  <PickerRow
                    key={template.id}
                    title={template.name}
                    subtitle={template.description}
                    onClick={() => handleAddTemplate(template.id)}
                  />
                ))}
              </div>
            </SidebarPanel>
          )}

          {/* Catalog search */}
          <SidebarPanel
            icon={<Search className="w-3 h-3 inline mr-1" />}
            title="Catálogo"
          >
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
              <OdontogramInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar procedimiento..."
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-2 py-0.5"
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
                  className="cursor-pointer text-[10px] px-2 py-0.5"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {/* El hex de categoría se queda como PUNTO de identidad: teñir
                      el chip entero (fondo, borde y texto) daba un contraste no
                      verificable y sin variante oscura. */}
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: PROCEDURE_CATEGORY_COLORS[cat] }}
                  />
                  {label}
                </Badge>
              ))}
            </div>

            {/* Procedure list */}
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {filteredCatalog.map((procedure) => (
                <PickerRow
                  key={procedure.id}
                  title={procedure.name}
                  titleAdornment={
                    procedure.isFavorite ? (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    ) : undefined
                  }
                  subtitle={`${procedure.estimatedDuration} min · ${formatCurrency(procedure.baseCost)}`}
                  subtitleClassName="tabular-nums"
                  onClick={() => handleAddProcedure(procedure)}
                />
              ))}
            </div>
          </SidebarPanel>
        </div>
      </div>
    </div>
  );


}

