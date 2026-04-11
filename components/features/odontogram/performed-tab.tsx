"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OdontogramCheckbox } from "@/components/odontogram/ui";
import { Clock, CheckCircle2 } from "lucide-react";
import type {
  Tooth,
  ToothSurface,
  ProcedurePlan,
  PerformedProcedure,
  PatientRiskLevel,
} from "./types";
import { GLOBAL_STATUS_LABELS, PLAN_STATUS_LABELS } from "./types";

interface PerformedTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  plans?: ProcedurePlan[];
  patientRisk?: PatientRiskLevel;
  onNavigateToTab?: (tab: string) => void;
  onSave?: (performed: PerformedProcedure[]) => void;
  onPlansChange?: (plans: ProcedurePlan[]) => void;
}

function getToothTypeName(toothNumber: number): string {
  const lastDigit = toothNumber % 10;
  if (lastDigit === 1 || lastDigit === 2) return "Incisivo";
  if (lastDigit === 3) return "Canino";
  if (lastDigit === 4 || lastDigit === 5) return "Premolar";
  if (lastDigit === 6 || lastDigit === 7 || lastDigit === 8) return "Molar";
  return "Diente";
}

export function PerformedTab({
  tooth,
  selectedSurfaces,
  plans = [],
  patientRisk = "medio",
  onNavigateToTab,
  onPlansChange,
}: PerformedTabProps) {
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    new Set(),
  );

  const pendingPlans = useMemo(() => {
    return plans.filter(
      (p) =>
        p.toothNumber === tooth.number &&
        (p.status === "plan" ||
          p.status === "in_progress" ||
          p.status === "scheduled"),
    );
  }, [plans, tooth.number]);

  const donePlans = useMemo(() => {
    return plans.filter(
      (p) => p.toothNumber === tooth.number && p.status === "done",
    );
  }, [plans, tooth.number]);

  const today = new Date().toISOString().split("T")[0];

  const scheduledToday = useMemo(() => {
    return pendingPlans.filter(
      (p) => p.status === "scheduled" && p.appointmentAt?.startsWith(today),
    );
  }, [pendingPlans, today]);

  const readyNow = useMemo(() => {
    return pendingPlans.filter(
      (p) =>
        p.status === "in_progress" || (p.status === "plan" && !p.appointmentAt),
    );
  }, [pendingPlans]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const handleMarkAsPerformed = () => {
    if (!onPlansChange) return;

    const updatedPlans = plans.map((p) =>
      selectedPlanIds.has(p.id) ? { ...p, status: "done" as const } : p,
    );
    onPlansChange(updatedPlans);
    setSelectedPlanIds(new Set());
  };

  const handleUndoPlan = (planId: string) => {
    if (!onPlansChange) return;

    const updatedPlans = plans.map((p) =>
      p.id === planId ? { ...p, status: "plan" as const } : p,
    );
    onPlansChange(updatedPlans);
  };

  const getRiskColor = (risk: PatientRiskLevel) => {
    if (risk === "bajo") return "bg-green-100 text-green-800 border-green-300";
    if (risk === "medio") return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  if (
    selectedSurfaces.length === 0 &&
    pendingPlans.length === 0 &&
    donePlans.length === 0
  ) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Selecciona superficies o crea un plan primero
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => onNavigateToTab?.("superficies")}
          >
            ← Superficies
          </Button>
          <Button variant="outline" onClick={() => onNavigateToTab?.("plan")}>
            ← Plan
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
          <h3 className="text-lg font-bold">
            Realizado · Diente {tooth.number}
          </h3>
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
        </div>
      </div>

      {/* Panel principal: dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Columna izquierda: Planes pendientes */}
        <div className="space-y-4">
          {/* Programados para hoy */}
          {scheduledToday.length > 0 && (
            <Card className="p-4 shadow-sm border-l-4 border-l-amber-400">
              <Label className="text-sm font-semibold mb-3 block">
                📅 Programados para hoy ({scheduledToday.length})
              </Label>
              <div className="space-y-2 mb-3">
                {scheduledToday.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-start gap-2 p-2 rounded border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 cursor-pointer"
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    <OdontogramCheckbox
                      checked={selectedPlanIds.has(plan.id)}
                      onChange={() => handleSelectPlan(plan.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{plan.displayName}</p>
                      {plan.surfaces.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {plan.surfaces.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-xs"
                            >
                              {s.charAt(0).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {plan.durationMin} min
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-100 text-amber-800 border-amber-300"
                        >
                          Programado
                        </Badge>
                        {plan.appointmentAt && (
                          <span className="text-xs">
                            {plan.appointmentAt.split("T")[1]?.substring(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={
                  scheduledToday.filter((p) => selectedPlanIds.has(p.id))
                    .length === 0
                }
                onClick={handleMarkAsPerformed}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como realizado (
                {scheduledToday.filter((p) => selectedPlanIds.has(p.id)).length}
                )
              </Button>
            </Card>
          )}

          {/* Para realizar ahora */}
          {readyNow.length > 0 && (
            <Card className="p-4 shadow-sm border-l-4 border-l-blue-400">
              <Label className="text-sm font-semibold mb-3 block">
                ⚡ Para realizar ahora ({readyNow.length})
              </Label>
              <div className="space-y-2 mb-3">
                {readyNow.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-start gap-2 p-2 rounded border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 cursor-pointer"
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    <OdontogramCheckbox
                      checked={selectedPlanIds.has(plan.id)}
                      onChange={() => handleSelectPlan(plan.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{plan.displayName}</p>
                      {plan.surfaces.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {plan.surfaces.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-xs"
                            >
                              {s.charAt(0).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {plan.durationMin} min
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-100 text-blue-800 border-blue-300"
                        >
                          {PLAN_STATUS_LABELS[plan.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={
                  readyNow.filter((p) => selectedPlanIds.has(p.id)).length === 0
                }
                onClick={handleMarkAsPerformed}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como realizado (
                {readyNow.filter((p) => selectedPlanIds.has(p.id)).length})
              </Button>
            </Card>
          )}

          {/* Otros planes pendientes */}
          {pendingPlans.length > 0 &&
            scheduledToday.length === 0 &&
            readyNow.length === 0 && (
              <Card className="p-4 shadow-sm">
                <Label className="text-sm font-semibold mb-3 block">
                  Planes pendientes ({pendingPlans.length})
                </Label>
                <div className="space-y-2 mb-3">
                  {pendingPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-start gap-2 p-2 rounded border hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      <OdontogramCheckbox
                        checked={selectedPlanIds.has(plan.id)}
                        onChange={() => handleSelectPlan(plan.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {plan.displayName}
                        </p>
                        {plan.surfaces.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {plan.surfaces.map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className="text-xs"
                              >
                                {s.charAt(0).toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {plan.durationMin} min
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {PLAN_STATUS_LABELS[plan.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={selectedPlanIds.size === 0}
                  onClick={handleMarkAsPerformed}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar como realizado ({selectedPlanIds.size})
                </Button>
              </Card>
            )}

          {pendingPlans.length === 0 && (
            <Card className="p-6 text-center border-2 border-dashed">
              <p className="text-sm text-muted-foreground">
                No hay planes pendientes
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onNavigateToTab?.("plan")}
              >
                ← Ir a Plan
              </Button>
            </Card>
          )}
        </div>

        {/* Columna derecha: Procedimientos realizados */}
        <div className="space-y-4">
          <Card className="p-4 shadow-sm border-l-4 border-l-green-400">
            <Label className="text-sm font-semibold mb-3 block">
              ✅ Procedimientos realizados ({donePlans.length})
            </Label>
            {donePlans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Marca planes como realizados para verlos aquí
              </p>
            ) : (
              <div className="space-y-2">
                {donePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-start gap-2 p-2 rounded border border-green-200 bg-green-50/50"
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{plan.displayName}</p>
                      {plan.surfaces.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {plan.surfaces.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-xs"
                            >
                              {s.charAt(0).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {plan.durationMin} min
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-100 text-green-800 border-green-300"
                        >
                          Realizado
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleUndoPlan(plan.id)}
                    >
                      Deshacer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
