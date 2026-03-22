"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  OdontogramModal,
  OdontogramTabs,
  useOdontogramConfirm,
} from "@/components/odontogram/ui";
import type { OdontogramTabItem } from "@/components/odontogram/ui";
import type {
  Tooth,
  ToothGlobalStatus,
  ToothSurface,
  ProcedurePlan,
  SurfaceDiagnosis,
  PulpalStatus,
  SurfaceTreatment,
  SurfaceCondition,
  ICDASScore,
  SurfaceState,
} from "./types";
import {
  GLOBAL_STATUS_LABELS,
  GLOBAL_STATUS_COLORS,
  SURFACE_STATUS_COLORS,
} from "./types";
import { useState, useEffect, useRef, useCallback } from "react";
import { SurfacesTab } from "./surfaces-tab";
import { DiagnosisTab } from "./diagnosis-tab";
import { PlanTab } from "./plan-tab";
import { PerformedTab } from "./performed-tab";
import { useOdontogramStore } from "@/lib/odontogram/store";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services";

interface ToothModalProps {
  tooth: Tooth | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateGlobalStatus: (
    toothNumber: number,
    status: ToothGlobalStatus,
  ) => void;
  onAddSurfaceTreatment?: (
    toothNumber: number,
    treatment: Omit<SurfaceTreatment, "id" | "date">,
  ) => void;
  onAddSurfaceCondition?: (
    toothNumber: number,
    condition: Omit<SurfaceCondition, "id" | "diagnosedDate">,
  ) => void;
  onDeleteCondition?: (toothNumber: number, conditionId: string) => void;
  onCompleteTreatment?: (toothNumber: number, treatmentId: string) => void;
  onDeleteTreatment?: (toothNumber: number, treatmentId: string) => void;
  onApplyAndNext?: () => void;
  initialSurfaces?: ToothSurface[];
}

function getToothDescription(toothNumber: number): string {
  const quadrant = Math.floor(toothNumber / 10);
  const position = toothNumber % 10;

  const type = ToothTypeService.getToothTypeName(toothNumber);

  let location = "";
  if (quadrant === 1) location = "superior derecho";
  else if (quadrant === 2) location = "superior izquierdo";
  else if (quadrant === 3) location = "inferior izquierdo";
  else if (quadrant === 4) location = "inferior derecho";

  let positionName = "";
  if (position === 1) positionName = "central";
  else if (position === 2) positionName = "lateral";
  else if (position === 3) positionName = "";
  else if (position === 4) positionName = "primer";
  else if (position === 5) positionName = "segundo";
  else if (position === 6) positionName = "primer";
  else if (position === 7) positionName = "segundo";
  else if (position === 8) positionName = "tercer";

  return `${type} ${positionName} ${location}`.trim();
}

export function ToothModal({
  tooth,
  isOpen,
  onClose,
  onUpdateGlobalStatus,
  onApplyAndNext,
  initialSurfaces,
}: ToothModalProps) {
  const {
    addClinicalEvent,
    getToothEvents,
    updateClinicalEvent,
    clinicalEvents,
  } = useOdontogramStore();
  const odontogramConfirm = useOdontogramConfirm();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // confirmación de cierre sin guardar se maneja con odontogramConfirm
  const [tempGlobalStatus, setTempGlobalStatus] =
    useState<ToothGlobalStatus>("healthy");
  const [activeTab, setActiveTab] = useState("superficies");
  const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>([]);
  const [initialSurfaceStates, setInitialSurfaceStates] = useState<
    SurfaceState[]
  >([]);
  const [diagnoses, setDiagnoses] = useState<
    Map<ToothSurface, SurfaceDiagnosis>
  >(new Map());
  const [pulpalStatus, setPulpalStatus] = useState<PulpalStatus>("normal");
  const [plans, setPlans] = useState<ProcedurePlan[]>([]);
  const surfaceStatesRef = useRef<SurfaceState[]>([]);
  const handleSurfaceStatesChange = useCallback((states: SurfaceState[]) => {
    surfaceStatesRef.current = states;
  }, []);

  useEffect(() => {
    if (isOpen && tooth) {
      setTempGlobalStatus(tooth.globalStatus);
      setHasUnsavedChanges(false);
      setActiveTab("superficies");

      // Obtener eventos clínicos del diente desde el store
      const events = getToothEvents(tooth.number);

      console.group(`[ToothModal] 📂 CARGA diente ${tooth.number}`);
      console.log(
        "Eventos clínicos del store:",
        JSON.parse(JSON.stringify(events)),
      );
      console.log("Total clinicalEvents en store:", clinicalEvents.length);
      console.log(
        "tooth.surfaceTreatments:",
        JSON.parse(JSON.stringify(tooth.surfaceTreatments)),
      );
      console.log(
        "tooth.surfaceConditions:",
        JSON.parse(JSON.stringify(tooth.surfaceConditions)),
      );
      console.log("tooth.globalStatus:", tooth.globalStatus);

      // Extraer superficies con eventos
      const surfacesWithEvents = new Set<ToothSurface>();
      events.forEach((event) => {
        event.surfaces.forEach((surface) => surfacesWithEvents.add(surface));
      });
      const loadedSurfaces = Array.from(surfacesWithEvents);
      console.log("Superficies extraídas de eventos:", loadedSurfaces);

      // Computar SurfaceState[] desde eventos clínicos
      const computedStates: SurfaceState[] = loadedSurfaces.map((surface) => {
        const diagEvent = events.find(
          (e) => e.type === "diagnosis" && e.surfaces.includes(surface),
        );
        const planEvent = events.find(
          (e) => e.type === "plan" && e.surfaces.includes(surface),
        );
        const performedEvent = events.find(
          (e) =>
            (e.type === "performed" || e.status === "done") &&
            e.surfaces.includes(surface),
        );

        if (performedEvent) {
          return {
            surface,
            status: "completed" as const,
            color: SURFACE_STATUS_COLORS.completed,
            treatmentType: performedEvent.procedureName,
            lastUpdate: performedEvent.updatedAt,
            notes: performedEvent.notes,
          };
        }
        if (planEvent) {
          return {
            surface,
            status: "planned" as const,
            color: SURFACE_STATUS_COLORS.planned,
            treatmentType: planEvent.procedureName,
            lastUpdate: planEvent.updatedAt,
            notes: planEvent.notes,
          };
        }
        if (diagEvent && diagEvent.icdasScore && diagEvent.icdasScore > 0) {
          return {
            surface,
            status: "pathology" as const,
            icdasScore: diagEvent.icdasScore as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            color: SURFACE_STATUS_COLORS.pathology,
            lastUpdate: diagEvent.updatedAt,
            notes: diagEvent.notes,
          };
        }
        return {
          surface,
          status: "healthy" as const,
          icdasScore: 0 as const,
          color: SURFACE_STATUS_COLORS.healthy,
          lastUpdate: new Date().toISOString(),
        };
      });

      console.log(
        "SurfaceStates computados:",
        JSON.parse(JSON.stringify(computedStates)),
      );
      console.groupEnd();

      setSelectedSurfaces(loadedSurfaces);
      setInitialSurfaceStates(computedStates);

      // Cargar diagnósticos
      const loadedDiagnoses = new Map<ToothSurface, SurfaceDiagnosis>();
      events
        .filter((e) => e.type === "diagnosis" && e.icdasScore !== undefined)
        .forEach((event) => {
          event.surfaces.forEach((surface) => {
            loadedDiagnoses.set(surface, {
              surface,
              icdasScore: event.icdasScore as ICDASScore,
              cariesActivity: "activa",
              nonCariousLesions: [],
              notes: event.notes || "",
              lastUpdate: event.createdAt,
            });
          });
        });
      setDiagnoses(loadedDiagnoses);

      // Cargar estado pulpar
      const endoEvent = events.find((e) => e.type === "endo");
      if (endoEvent && endoEvent.notes) {
        const pulpalMatch = endoEvent.notes.match(/Estado pulpar: (\w+)/);
        if (pulpalMatch) {
          const status = pulpalMatch[1] as PulpalStatus;
          setPulpalStatus(status);
        }
      } else {
        setPulpalStatus("normal");
      }

      // Cargar planes
      const loadedPlans: ProcedurePlan[] = events
        .filter((e) => e.type === "plan" && e.status === "plan")
        .map((event) => ({
          id: event.id,
          toothNumber: tooth.number,
          surfaces: event.surfaces,
          procedureId: event.procedureId || "custom",
          displayName: event.procedureName || event.notes || "Procedimiento",
          category: event.category || "restaurador",
          status: "plan",
          priority: event.priority || "media",
          material: event.material,
          durationMin: event.durationMin || 30,
          cost: event.cost || 0,
          notes: event.notes,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          authorId: event.authorId,
        }));

      setPlans(loadedPlans);
    }
  }, [isOpen, tooth, getToothEvents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        const tabs = [
          "superficies",
          "diagnostico",
          "plan",
          "realizado",
          "perio",
          "historial",
        ];
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab]);

  if (!tooth) return null;

  const handleStatusClick = (status: ToothGlobalStatus) => {
    if (status !== tempGlobalStatus) {
      setTempGlobalStatus(status);
      setHasUnsavedChanges(true);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      odontogramConfirm({
        title: "¿Cerrar sin guardar?",
        description: `Tienes cambios sin guardar en el diente ${tooth.number}. Si cierras ahora, se perderán estos cambios.`,
        okText: "Cerrar sin guardar",
        cancelText: "Volver",
        danger: true,
        onOk: () => {
          setHasUnsavedChanges(false);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (!tooth) return;

    console.group(`[ToothModal] 💾 GUARDADO diente ${tooth.number}`);
    console.log("hasUnsavedChanges:", hasUnsavedChanges);
    console.log(
      "tempGlobalStatus:",
      tempGlobalStatus,
      "vs original:",
      tooth.globalStatus,
    );
    console.log("selectedSurfaces (state):", selectedSurfaces);
    console.log(
      "diagnoses (state):",
      diagnoses instanceof Map ? Object.fromEntries(diagnoses) : diagnoses,
    );
    console.log("plans (state):", JSON.parse(JSON.stringify(plans)));
    console.log("pulpalStatus (state):", pulpalStatus);

    if (hasUnsavedChanges && tempGlobalStatus !== tooth.globalStatus) {
      onUpdateGlobalStatus(tooth.number, tempGlobalStatus);
    }

    // Usar window globals si DiagnosisTab los escribió, si no, fallback a React state
    const currentDiagnoses: Map<ToothSurface, SurfaceDiagnosis> =
      (typeof window !== "undefined" && (window as any).__currentDiagnoses) ||
      diagnoses;
    console.log(
      "currentDiagnoses (window o state):",
      currentDiagnoses instanceof Map
        ? Object.fromEntries(currentDiagnoses)
        : currentDiagnoses,
    );

    // Guardar diagnósticos del DiagnosisTab o cargados del store
    if (currentDiagnoses && currentDiagnoses.size > 0) {
      currentDiagnoses.forEach(
        (diagnosis: SurfaceDiagnosis, surface: ToothSurface) => {
          const existingEvent = getToothEvents(tooth.number).find(
            (e) => e.type === "diagnosis" && e.surfaces.includes(surface),
          );

          if (existingEvent) {
            updateClinicalEvent(existingEvent.id, {
              icdasScore: diagnosis.icdasScore,
              notes: diagnosis.notes || `ICDAS ${diagnosis.icdasScore}`,
              severity: diagnosis.icdasScore,
            });
          } else {
            addClinicalEvent({
              toothNumber: tooth.number,
              surfaces: [surface],
              level: "surface",
              type: "diagnosis",
              status: "open",
              severity: diagnosis.icdasScore,
              icdasScore: diagnosis.icdasScore,
              notes: diagnosis.notes || `ICDAS ${diagnosis.icdasScore}`,
            });
          }
        },
      );
    }

    // Auto-generar eventos de diagnóstico desde templates aplicados en SurfacesTab
    const surfaceStates = surfaceStatesRef.current;
    surfaceStates.forEach((state) => {
      if (
        state.status === "pathology" &&
        state.icdasScore &&
        state.icdasScore > 0
      ) {
        // Solo crear si no hay ya un diagnóstico para esta superficie
        const alreadyHandled =
          currentDiagnoses instanceof Map &&
          currentDiagnoses.has(state.surface);
        if (!alreadyHandled) {
          const existingEvent = getToothEvents(tooth.number).find(
            (e) => e.type === "diagnosis" && e.surfaces.includes(state.surface),
          );

          if (existingEvent) {
            updateClinicalEvent(existingEvent.id, {
              icdasScore: state.icdasScore,
              notes: `ICDAS ${state.icdasScore}`,
              severity: state.icdasScore,
            });
          } else {
            addClinicalEvent({
              toothNumber: tooth.number,
              surfaces: [state.surface],
              level: "surface",
              type: "diagnosis",
              status: "open",
              severity: state.icdasScore,
              icdasScore: state.icdasScore,
              notes: `ICDAS ${state.icdasScore}`,
            });
          }
        }
      }
    });

    const currentPlans =
      (typeof window !== "undefined" && (window as any).__currentPlans) ||
      plans;
    if (currentPlans && currentPlans.length > 0) {
      currentPlans.forEach((plan: ProcedurePlan, index: number) => {
        const existingPlanEvent = getToothEvents(tooth.number).find(
          (e) =>
            e.type === "plan" &&
            e.procedureId === plan.procedureId &&
            e.surfaces.length === plan.surfaces.length &&
            e.surfaces.every((s) => plan.surfaces.includes(s)),
        );

        if (existingPlanEvent) {
          const planStatus = plan.status === "done" ? "canceled" : plan.status;

          updateClinicalEvent(existingPlanEvent.id, {
            status: planStatus,
            priority: plan.priority,
            material: plan.material,
            durationMin: plan.durationMin,
            cost: plan.cost,
            notes: `${plan.displayName}${plan.notes ? `: ${plan.notes}` : ""}`,
          });
        } else {
          addClinicalEvent({
            toothNumber: tooth.number,
            surfaces: plan.surfaces,
            level: plan.surfaces.length > 0 ? "surface" : "tooth",
            type: "plan",
            status: plan.status,
            procedureId: plan.procedureId,
            procedureName: plan.displayName,
            category: plan.category,
            priority: plan.priority,
            material: plan.material,
            durationMin: plan.durationMin,
            cost: plan.cost,
            notes: `${plan.displayName}${plan.notes ? `: ${plan.notes}` : ""}`,
          });
        }

        if (plan.status === "done") {
          // Buscar evento performed existente de manera más flexible
          const existingPerformedEvent = getToothEvents(tooth.number).find(
            (e) => e.type === "performed" && e.procedureId === plan.procedureId,
          );

          if (!existingPerformedEvent) {
            const newPerformedEvent = {
              toothNumber: tooth.number,
              surfaces: plan.surfaces,
              level: (plan.surfaces.length > 0 ? "surface" : "tooth") as
                | "surface"
                | "tooth",
              type: "performed" as const,
              status: "done" as const,
              procedureId: plan.procedureId,
              procedureName: plan.displayName,
              category: plan.category,
              priority: plan.priority,
              material: plan.material,
              durationMin: plan.durationMin,
              cost: plan.cost,
              notes: `Realizado: ${plan.displayName}${plan.notes ? ` - ${plan.notes}` : ""}`,
            };

            const eventId = addClinicalEvent(newPerformedEvent);

            // Verificar inmediatamente que se guardó
            const verifyEvent = getToothEvents(tooth.number).find(
              (e) =>
                e.type === "performed" && e.procedureId === plan.procedureId,
            );
          }
        }
      });
    }

    const currentPulpalStatus =
      (typeof window !== "undefined" &&
        (window as any).__currentPulpalStatus) ||
      pulpalStatus;
    if (currentPulpalStatus && currentPulpalStatus !== "normal") {
      const existingEndoEvent = getToothEvents(tooth.number).find(
        (e) => e.type === "endo",
      );

      if (existingEndoEvent) {
        updateClinicalEvent(existingEndoEvent.id, {
          notes: `Estado pulpar: ${currentPulpalStatus}`,
        });
      } else {
        addClinicalEvent({
          toothNumber: tooth.number,
          surfaces: [],
          level: "tooth",
          type: "endo",
          status: "observation",
          notes: `Estado pulpar: ${currentPulpalStatus}`,
        });
      }
    }

    // Verificación post-guardado
    const postSaveEvents = getToothEvents(tooth.number);
    console.log(
      "[POST-SAVE] Eventos en store para diente",
      tooth.number,
      ":",
      JSON.parse(JSON.stringify(postSaveEvents)),
    );
    console.log("[POST-SAVE] Total clinicalEvents:", clinicalEvents.length);
    console.groupEnd();

    setHasUnsavedChanges(false);
  };

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  const handleApplyAndNext = () => {
    handleSave();
    setHasUnsavedChanges(false);
    if (onApplyAndNext) {
      onApplyAndNext();
    }
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const handleDiagnosesChange = (
    newDiagnoses: Map<ToothSurface, SurfaceDiagnosis>,
  ) => {
    setDiagnoses(newDiagnoses);
    setHasUnsavedChanges(true);
  };

  const handlePulpalStatusChange = (status: PulpalStatus) => {
    setPulpalStatus(status);
    setHasUnsavedChanges(true);
  };

  const handlePlansChange = (newPlans: ProcedurePlan[]) => {
    setPlans(newPlans);
    setHasUnsavedChanges(true);
  };

  const tabItems: OdontogramTabItem[] = [
    {
      key: "superficies",
      label: "Superficies",
      children: (
        <SurfacesTab
          tooth={tooth}
          initialSurfaces={selectedSurfaces}
          initialSurfaceStates={initialSurfaceStates}
          onNavigateToTab={handleNavigateToTab}
          onSurfacesChange={setSelectedSurfaces}
          onSurfaceStatesChange={handleSurfaceStatesChange}
        />
      ),
    },
    {
      key: "diagnostico",
      label: "Diagnóstico (ICDAS)",
      children: (
        <DiagnosisTab
          tooth={tooth}
          selectedSurfaces={selectedSurfaces}
          initialDiagnoses={diagnoses}
          initialPulpalStatus={pulpalStatus}
          onNavigateToTab={handleNavigateToTab}
          onDiagnosesChange={handleDiagnosesChange}
          onPulpalStatusChange={handlePulpalStatusChange}
        />
      ),
    },
    {
      key: "plan",
      label: "Plan",
      children: (
        <PlanTab
          tooth={tooth}
          selectedSurfaces={selectedSurfaces}
          diagnoses={diagnoses}
          pulpalStatus={pulpalStatus}
          initialPlans={plans}
          onNavigateToTab={handleNavigateToTab}
          onPlansChange={handlePlansChange}
        />
      ),
    },
    {
      key: "realizado",
      label: "Realizado",
      children: (
        <PerformedTab
          tooth={tooth}
          selectedSurfaces={selectedSurfaces}
          plans={plans}
          onNavigateToTab={handleNavigateToTab}
        />
      ),
    },
    {
      key: "perio",
      label: "Perio",
      children: (
        <div className="p-12 border-2 border-dashed rounded-lg text-center text-muted-foreground">
          <p className="text-base">Contenido de Perio (próximamente)</p>
        </div>
      ),
    },
    {
      key: "historial",
      label: "Historial",
      children: (
        <div className="p-12 border-2 border-dashed rounded-lg text-center text-muted-foreground">
          <p className="text-base">Contenido de Historial (próximamente)</p>
        </div>
      ),
    },
  ];

  return (
    <OdontogramModal
      open={isOpen}
      onClose={handleClose}
      title={`Diente ${tooth.number}`}
      description={getToothDescription(tooth.number)}
      footer={
        <div className="flex justify-between items-center gap-4 pt-3 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-6 py-2 text-sm bg-transparent"
          >
            Cancelar
          </Button>
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={handleSaveAndClose}
              className="px-6 py-2 text-sm"
            >
              Guardar
            </Button>
            <Button
              variant="default"
              onClick={handleApplyAndNext}
              className="px-6 py-2 text-sm"
            >
              Aplicar y seguir →
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2 pb-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground">
          Estado Global del Diente
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GLOBAL_STATUS_LABELS) as ToothGlobalStatus[]).map(
            (status) => {
              const isSelected = tempGlobalStatus === status;
              return (
                <Badge
                  key={status}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1 text-xs font-medium transition-all hover:scale-105"
                  style={
                    isSelected
                      ? {
                          backgroundColor: GLOBAL_STATUS_COLORS[status],
                          borderColor: GLOBAL_STATUS_COLORS[status],
                          color: "white",
                        }
                      : {
                          borderColor: GLOBAL_STATUS_COLORS[status],
                          color: GLOBAL_STATUS_COLORS[status],
                        }
                  }
                  onClick={() => handleStatusClick(status)}
                >
                  {GLOBAL_STATUS_LABELS[status]}
                </Badge>
              );
            },
          )}
        </div>
        {hasUnsavedChanges && (
          <p className="text-xs text-amber-600 font-semibold">
            ⚠️ Tienes cambios sin guardar
          </p>
        )}
      </div>

      <OdontogramTabs
        items={tabItems}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </OdontogramModal>
  );
}
