"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui";
import { OdontogramCheckbox, RISK_TONE } from "@/components/odontogram/ui";
import { OdontogramEmptyState } from "./ui/OdontogramEmptyState";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ListChecks,
  Undo2,
} from "lucide-react";
import type {
  Tooth,
  ToothSurface,
  ProcedurePlan,
  PerformedProcedure,
  PatientRiskLevel,
} from "./types";
import {
  GLOBAL_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  projectToCanonicalSurface,
} from "./types";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services";

interface PerformedTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  plans?: ProcedurePlan[];
  performed?: PerformedProcedure[];
  patientRisk?: PatientRiskLevel;
  patientRiskReasons?: string[];
  readOnly?: boolean;
  onNavigateToTab?: (tab: string) => void;
  onSave?: (performed: PerformedProcedure[]) => void;
  onPlansChange?: (plans: ProcedurePlan[]) => void;
}

interface TimelineItem {
  id: string;
  label: string;
  surfaces: ToothSurface[];
  durationMin: number;
  notes?: string;
  updatedAt: string;
  fromPlanId?: string;
  legacy: boolean;
}

const PERFORMED_ID_PREFIX = "performed:";


/**
 * Abreviatura clínica de una celda. La inicial del código NO sirve desde el
 * desdoble por vista: `mesialVestibular` y `mesialOclusal` colapsarían ambas en
 * "M" y el chip mostraría dos veces lo mismo para dos superficies distintas.
 * `getSurfaceLabel` además decide palatino vs lingual por arcada.
 */
function formatSurfaceLabel(toothNumber: number, surface: ToothSurface) {
  return ToothTypeService.getSurfaceLabel(toothNumber, surface).short;
}

function formatDateLabel(dateValue?: string) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-419", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function sameSurfaces(left: ToothSurface[], right: ToothSurface[]) {
  if (left.length !== right.length) return false;

  return left.every((surface) => right.includes(surface));
}

function buildPerformedId(planId: string) {
  return `${PERFORMED_ID_PREFIX}${planId}`;
}

function buildPerformedFromPlan(
  plan: ProcedurePlan,
  toothNumber: number,
  existing?: PerformedProcedure,
): PerformedProcedure {
  const timestamp = new Date().toISOString();

  return {
    id: existing?.id ?? buildPerformedId(plan.id),
    visitId: existing?.visitId,
    toothNumber,
    surfaces: plan.surfaces,
    level: plan.surfaces.length > 0 ? "surface" : "tooth",
    procedureId: plan.procedureId,
    adHocName: plan.displayName,
    fromPlanId: plan.id,
    status: "done",
    materials: existing?.materials ?? [],
    durationMin: existing?.durationMin ?? plan.durationMin,
    attachments: existing?.attachments ?? [],
    notes: existing?.notes ?? plan.notes,
    outcome: existing?.outcome ?? "ok",
    recommendation: existing?.recommendation,
    operatorId: existing?.operatorId,
    signedAt: existing?.signedAt ?? timestamp,
    protocol: existing?.protocol,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function resolveLinkedPlanId(
  item: PerformedProcedure,
  plans: ProcedurePlan[],
): string | undefined {
  if (item.fromPlanId && plans.some((plan) => plan.id === item.fromPlanId)) {
    return item.fromPlanId;
  }

  if (item.id.startsWith(PERFORMED_ID_PREFIX)) {
    const prefixedPlanId = item.id.slice(PERFORMED_ID_PREFIX.length);
    if (plans.some((plan) => plan.id === prefixedPlanId)) {
      return prefixedPlanId;
    }
  }

  return plans.find(
    (plan) =>
      plan.status === "done" &&
      plan.procedureId === item.procedureId &&
      sameSurfaces(plan.surfaces, item.surfaces),
  )?.id;
}

function PlanGroup({
  title,
  description,
  plans,
  selectedPlanIds,
  readOnly,
  onToggle,
}: {
  title: string;
  description: string;
  plans: ProcedurePlan[];
  selectedPlanIds: Set<string>;
  readOnly: boolean;
  onToggle: (planId: string) => void;
}) {
  if (plans.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-hairline bg-surface p-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-semibold text-ink">
            {title}
          </Label>
          <Badge variant="outline" className="text-xs">
            {plans.length}
          </Badge>
        </div>
        <p className="text-xs text-subtle">{description}</p>
      </div>

      <div className="space-y-2">
        {plans.map((plan) => {
          const isSelected = selectedPlanIds.has(plan.id);

          return (
            <div
              key={plan.id}
              role="button"
              tabIndex={readOnly ? -1 : 0}
              aria-pressed={isSelected}
              aria-disabled={readOnly || undefined}
              onClick={() => !readOnly && onToggle(plan.id)}
              onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(plan.id);
                }
              }}
              className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 ${
                isSelected
                  ? "border-emerald-400/25 bg-emerald-500/15 shadow-sm"
                  : "border-hairline bg-elevated hover:border-hairline hover:bg-hover"
              } ${readOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
            >
              <div className="flex items-start gap-3">
                {/* El checkbox (Radix = <button>) va aislado: stopPropagation
                    evita que su clic burbujee al contenedor y dispare un doble
                    toggle; el contenedor es <div role="button"> para no anidar
                    <button> dentro de <button>. */}
                <div
                  className="pt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <OdontogramCheckbox
                    checked={isSelected}
                    disabled={readOnly}
                    onChange={() => onToggle(plan.id)}
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {plan.displayName}
                      </p>
                      <p className="text-xs text-subtle">
                        {PLAN_STATUS_LABELS[plan.status]}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {plan.priority}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {plan.surfaces.length > 0 ? (
                      plan.surfaces.map((surface) => (
                        <Badge
                          key={surface}
                          variant="outline"
                          className="bg-elevated text-[11px]"
                        >
                          {/* El diente sale del propio plan: PlanGroup es un
                              componente suelto, sin el diente en scope. */}
                          {formatSurfaceLabel(plan.toothNumber, surface)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="bg-elevated text-[11px]">
                        Diente completo
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-subtle">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {plan.durationMin} min
                    </span>
                    {plan.appointmentAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDateLabel(plan.appointmentAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformedTab({
  tooth,
  selectedSurfaces,
  plans = [],
  performed = [],
  patientRisk = "medio",
  patientRiskReasons,
  readOnly = false,
  onNavigateToTab,
  onSave,
  onPlansChange,
}: PerformedTabProps) {
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    new Set(),
  );

  // Mismo conteo PROYECTADO a superficies canónicas ADA que Superficies y
  // Diagnóstico: una MOD son 3 superficies aunque se hayan marcado 5 celdas.
  // Contar celdas crudas hacía que el mismo modal diera dos números distintos
  // para el mismo diente según la pestaña.
  const canonicalSurfaceCount = useMemo(
    () => new Set(selectedSurfaces.map(projectToCanonicalSurface)).size,
    [selectedSurfaces],
  );

  const plansForTooth = useMemo(
    () => plans.filter((plan) => plan.toothNumber === tooth.number),
    [plans, tooth.number],
  );

  const performedForTooth = useMemo(
    () =>
      performed
        .filter((item) => item.toothNumber === tooth.number)
        .map((item) => ({
          ...item,
          fromPlanId: resolveLinkedPlanId(item, plansForTooth),
        })),
    [performed, tooth.number, plansForTooth],
  );

  const pendingPlans = useMemo(
    () =>
      plansForTooth.filter(
        (plan) =>
          plan.status === "plan" ||
          plan.status === "in_progress" ||
          plan.status === "scheduled",
      ),
    [plansForTooth],
  );

  const today = new Date().toISOString().split("T")[0];

  const scheduledToday = useMemo(
    () =>
      pendingPlans.filter(
        (plan) =>
          plan.status === "scheduled" &&
          Boolean(plan.appointmentAt?.startsWith(today)),
      ),
    [pendingPlans, today],
  );

  const readyNow = useMemo(
    () =>
      pendingPlans.filter(
        (plan) =>
          plan.status === "in_progress" ||
          (plan.status === "plan" && !plan.appointmentAt),
      ),
    [pendingPlans],
  );

  const otherPending = useMemo(
    () =>
      pendingPlans.filter(
        (plan) =>
          !scheduledToday.some((candidate) => candidate.id === plan.id) &&
          !readyNow.some((candidate) => candidate.id === plan.id),
      ),
    [pendingPlans, readyNow, scheduledToday],
  );

  useEffect(() => {
    const pendingIds = new Set(pendingPlans.map((plan) => plan.id));
    setSelectedPlanIds((current) => {
      const next = new Set(
        Array.from(current).filter((planId) => pendingIds.has(planId)),
      );

      return next.size === current.size ? current : next;
    });
  }, [pendingPlans]);

  const selectedPlans = useMemo(
    () => pendingPlans.filter((plan) => selectedPlanIds.has(plan.id)),
    [pendingPlans, selectedPlanIds],
  );

  const selectedPlanDuration = useMemo(
    () => selectedPlans.reduce((total, plan) => total + plan.durationMin, 0),
    [selectedPlans],
  );

  const timelineItems = useMemo(() => {
    const trackedPlanIds = new Set<string>();
    const items: TimelineItem[] = performedForTooth.map((item) => {
      if (item.fromPlanId) {
        trackedPlanIds.add(item.fromPlanId);
      }

      return {
        id: item.id,
        label: item.adHocName || item.procedureId || "Procedimiento realizado",
        surfaces: item.surfaces,
        durationMin: item.durationMin,
        notes: item.notes,
        updatedAt: item.updatedAt,
        fromPlanId: item.fromPlanId,
        legacy: false,
      };
    });

    plansForTooth
      .filter((plan) => plan.status === "done" && !trackedPlanIds.has(plan.id))
      .forEach((plan) => {
        items.push({
          id: `legacy:${plan.id}`,
          label: plan.displayName,
          surfaces: plan.surfaces,
          durationMin: plan.durationMin,
          notes: plan.notes,
          updatedAt: plan.updatedAt,
          fromPlanId: plan.id,
          legacy: true,
        });
      });

    return items.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );
  }, [performedForTooth, plansForTooth]);

  const completedPlanCount = useMemo(() => {
    const linkedPlanIds = new Set<string>();

    timelineItems.forEach((item) => {
      if (item.fromPlanId) {
        linkedPlanIds.add(item.fromPlanId);
      }
    });

    return linkedPlanIds.size;
  }, [timelineItems]);

  const totalPlannedCount = plansForTooth.length;
  const progressPercent =
    totalPlannedCount === 0
      ? timelineItems.length > 0
        ? 100
        : 0
      : Math.min(
          100,
          Math.round((completedPlanCount / totalPlannedCount) * 100),
        );

  const handleTogglePlan = (planId: string) => {
    if (readOnly) return;

    setSelectedPlanIds((current) => {
      const next = new Set(current);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleRegisterPerformed = () => {
    if (readOnly || selectedPlans.length === 0) return;

    const existingByPlanId = new Map(
      performedForTooth
        .filter((item) => item.fromPlanId)
        .map((item) => [item.fromPlanId as string, item]),
    );

    const nextPlans = plans.map((plan) =>
      selectedPlanIds.has(plan.id)
        ? {
            ...plan,
            status: "done" as const,
            updatedAt: new Date().toISOString(),
          }
        : plan,
    );

    const nextPerformed = [
      ...performedForTooth.filter(
        (item) => !selectedPlanIds.has(item.fromPlanId ?? ""),
      ),
      ...selectedPlans.map((plan) =>
        buildPerformedFromPlan(
          plan,
          tooth.number,
          existingByPlanId.get(plan.id),
        ),
      ),
    ];

    onPlansChange?.(nextPlans);
    onSave?.(nextPerformed);
    setSelectedPlanIds(new Set());
  };

  const handleUndoPerformed = (item: TimelineItem) => {
    if (readOnly) return;

    const nextPerformed = performedForTooth.filter(
      (performedItem) => performedItem.id !== item.id,
    );

    onSave?.(nextPerformed);

    if (item.fromPlanId) {
      const nextPlans = plans.map((plan) =>
        plan.id === item.fromPlanId
          ? {
              ...plan,
              status: "plan" as const,
              updatedAt: new Date().toISOString(),
            }
          : plan,
      );
      onPlansChange?.(nextPlans);
    }
  };

  if (
    selectedSurfaces.length === 0 &&
    pendingPlans.length === 0 &&
    timelineItems.length === 0
  ) {
    return (
      <Card className="border-dashed p-8 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <p className="text-base font-semibold text-ink">
            Aún no hay trabajo listo para registrar
          </p>
          <p className="text-sm text-subtle">
            Define superficies y crea al menos un plan para convertir esta tab
            en el cierre operativo del diente.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => onNavigateToTab?.("superficies")}
            >
              Superficies
            </Button>
            <Button variant="outline" onClick={() => onNavigateToTab?.("plan")}>
              Plan
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header PLANO, con el mismo patrón que Diagnóstico (h3 + subtítulo):
          sin banda de color, que no sobrevivía al tema oscuro. El h3 no es
          decorativo — sostiene la jerarquía de encabezados de la pestaña, cuyos
          h4 quedarían huérfanos (el título del modal no emite encabezado). */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            Realizado · Diente {tooth.number}
          </h3>
          <p className="text-sm text-subtle">
            {ToothTypeService.getToothTypeName(tooth.number)} ·{" "}
            {canonicalSurfaceCount} superficie
            {canonicalSurfaceCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge
            tone={RISK_TONE[patientRisk]}
            title={patientRiskReasons?.join(" · ")}
          >
            Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
          </StatusBadge>
          <Badge variant="outline" className="bg-elevated text-xs">
            {GLOBAL_STATUS_LABELS[tooth.globalStatus]}
          </Badge>
          <Badge
            variant="outline"
            className="bg-elevated text-xs text-emerald-600 dark:text-emerald-300"
          >
            {timelineItems.length} registrado
            {timelineItems.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          <Card className="overflow-hidden border-hairline shadow-sm">
            <div className="border-b border-hairline bg-surface px-4 py-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-subtle" />
                    <h4 className="text-sm font-semibold text-ink">
                      Pendientes por ejecutar
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    Selecciona uno o varios planes para registrarlos como
                    procedimientos realizados.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-elevated text-xs">
                  {pendingPlans.length} pendiente
                  {pendingPlans.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>

            <div className="space-y-4 bg-hover p-4">
              <PlanGroup
                title="Programados hoy"
                description="Tratamientos ya agendados para esta cita o para el mismo día."
                plans={scheduledToday}
                selectedPlanIds={selectedPlanIds}
                readOnly={readOnly}
                onToggle={handleTogglePlan}
              />
              <PlanGroup
                title="Listos para ejecutar"
                description="Planes activos sin bloqueo de agenda, pensados para resolver ahora."
                plans={readyNow}
                selectedPlanIds={selectedPlanIds}
                readOnly={readOnly}
                onToggle={handleTogglePlan}
              />
              <PlanGroup
                title="Siguientes pasos"
                description="Pendientes que siguen vigentes, pero no pertenecen al bloque inmediato."
                plans={otherPending}
                selectedPlanIds={selectedPlanIds}
                readOnly={readOnly}
                onToggle={handleTogglePlan}
              />

              {pendingPlans.length === 0 && (
                <div className="rounded-xl border border-dashed border-hairline bg-surface p-6">
                  <OdontogramEmptyState description="No hay planes pendientes en este diente." />
                  <div className="mt-3 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateToTab?.("plan")}
                    >
                      Ir a Plan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-0">
          <Card className="border-hairline bg-surface shadow-sm">
            <div className="space-y-4 p-4">
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Resumen de ejecución
                </h4>
                <p className="mt-1 text-xs text-subtle">
                  Realizado funciona como el paso terminal del flujo del modal.
                </p>
              </div>

              <div className="grid grid-cols-3 items-stretch gap-2">
                <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-hairline bg-hover px-2 py-3 text-center">
                  <p className="flex min-h-10 items-center justify-center text-[10px] font-medium uppercase leading-tight text-subtle sm:text-[11px]">
                    Pendientes
                  </p>
                  <p className="mt-1 text-xl font-bold leading-none text-ink tabular-nums sm:text-2xl">
                    {pendingPlans.length}
                  </p>
                </div>
                <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-2 py-3 text-center">
                  <p className="flex min-h-10 items-center justify-center text-[10px] font-medium uppercase leading-tight text-emerald-600 dark:text-emerald-300 sm:text-[11px]">
                    Listos
                  </p>
                  <p className="mt-1 text-xl font-bold leading-none text-emerald-600 dark:text-emerald-300 tabular-nums sm:text-2xl">
                    {selectedPlans.length}
                  </p>
                </div>
                <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-hairline bg-hover px-2 py-3 text-center">
                  <p className="flex min-h-10 items-center justify-center text-[10px] font-medium uppercase leading-tight text-subtle sm:text-[11px]">
                    Hechos
                  </p>
                  <p className="mt-1 text-xl font-bold leading-none text-ink tabular-nums sm:text-2xl">
                    {completedPlanCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-subtle">Progreso</span>
                  <span className="text-ink tabular-nums">
                    {totalPlannedCount > 0
                      ? `${completedPlanCount} de ${totalPlannedCount}`
                      : `${timelineItems.length} realizados`}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso de procedimientos realizados"
                  className="h-2 overflow-hidden rounded-full bg-hover"
                >
                  <div
                    className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-subtle">
                  {selectedPlans.length > 0
                    ? `${selectedPlans.length} plan${selectedPlans.length === 1 ? " seleccionado" : "es seleccionados"} · ${selectedPlanDuration} min estimados`
                    : "Selecciona tratamientos pendientes para registrarlos en bloque."}
                </p>
              </div>

              <Button
                className="w-full"
                disabled={readOnly || selectedPlans.length === 0}
                onClick={handleRegisterPerformed}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Registrar realizados
              </Button>

              {readOnly && (
                <p className="text-xs text-subtle">
                  {/* Igual que en el modal del diente: el bloqueo puede venir de
                      histórico, visita finalizada o falta de permiso, así que no
                      se promete que iniciar una consulta lo resuelva. */}
                  Solo lectura — no se puede registrar la ejecución aquí.
                </p>
              )}
            </div>
          </Card>

          <Card className="border-hairline bg-surface shadow-sm">
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink">
                    Timeline de realizados
                  </h4>
                  <p className="mt-1 text-xs text-subtle">
                    Registro cronológico de lo ya ejecutado sobre este diente.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-elevated text-xs text-emerald-600 dark:text-emerald-300"
                >
                  {timelineItems.length}
                </Badge>
              </div>

              {timelineItems.length === 0 ? (
                <OdontogramEmptyState description="Aún no hay procedimientos realizados registrados." />
              ) : (
                <div className="space-y-3">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="mt-1 h-full w-px bg-border" />
                      </div>

                      <div className="min-w-0 flex-1 rounded-xl border border-hairline bg-hover p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {item.label}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle">
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {formatDateLabel(item.updatedAt)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {item.durationMin} min
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.legacy && (
                              <Badge
                                variant="outline"
                                className="bg-elevated text-[11px]"
                              >
                                Histórico
                              </Badge>
                            )}
                            {!readOnly && item.fromPlanId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleUndoPerformed(item)}
                              >
                                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.surfaces.length > 0 ? (
                            item.surfaces.map((surface) => (
                              <Badge
                                key={`${item.id}-${surface}`}
                                variant="outline"
                                className="bg-elevated text-[11px]"
                              >
                                {formatSurfaceLabel(tooth.number, surface)}
                              </Badge>
                            ))
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-elevated text-[11px]"
                            >
                              Diente completo
                            </Badge>
                          )}
                        </div>

                        {item.notes && (
                          <p className="mt-2 text-xs leading-5 text-subtle">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {!readOnly && pendingPlans.length > 0 && (
            <Card className="border-dashed border-hairline bg-surface shadow-sm">
              <div className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-semibold text-ink">
                    Si algo sigue faltando, vuelve al plan
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    Ajusta prioridad, sesión o agenda antes de registrar la
                    ejecución.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToTab?.("plan")}
                >
                  Plan
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
