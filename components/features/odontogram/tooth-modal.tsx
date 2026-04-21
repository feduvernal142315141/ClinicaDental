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
  ToothDiagnosis,
  ToothGlobalStatus,
  ToothSurface,
  ProcedurePlan,
  PerformedProcedure,
  SurfaceDiagnosis,
  SurfaceTreatment,
  SurfaceCondition,
  ICDASScore,
  SurfaceState,
  VitalityTest,
} from "./types";
import { createSurfaceRef } from "./types";
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
import { App } from "antd";
import { SchedulePlanModal } from "./schedule-plan-modal";
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

function getDefaultVitalityTests(): VitalityTest[] {
  return [
    { type: "frio", result: "no-realizado" },
    { type: "calor", result: "no-realizado" },
    { type: "ept", result: "no-realizado" },
    { type: "percusion", result: "no-realizado" },
    { type: "palpacion", result: "no-realizado" },
  ];
}

function buildSurfaceDiagnosisNotes(diagnosis: SurfaceDiagnosis): string {
  const parts: string[] = [`ICDAS ${diagnosis.icdasScore}`];

  if (diagnosis.cariesType) {
    parts.push(`Tipo: ${diagnosis.cariesType}`);
  }

  if (diagnosis.cariesActivity && diagnosis.cariesActivity !== "no-aplica") {
    parts.push(`Actividad: ${diagnosis.cariesActivity}`);
  }

  if (diagnosis.nonCariousLesions.length > 0) {
    parts.push(`Lesiones: ${diagnosis.nonCariousLesions.join(", ")}`);
  }

  if (diagnosis.notes) {
    parts.push(diagnosis.notes);
  }

  return parts.join(" · ");
}

function buildPlanVisualState(plan: ProcedurePlan) {
  const affectsOdontogram = plan.surfaces.length > 0;

  if (!affectsOdontogram) {
    return {
      affectsOdontogram: false,
      priorityKey: "support-only",
    };
  }

  if (plan.status === "done") {
    return {
      affectsOdontogram: true,
      priorityKey: "completed",
      symbolKey:
        plan.category === "protesis"
          ? "crown"
          : plan.category === "preventivo"
            ? "preventive"
            : "restoration",
    };
  }

  return {
    affectsOdontogram: true,
    priorityKey: plan.priority === "alta" ? "planned-urgent" : "planned",
  };
}

function hasMeaningfulToothDiagnosis(diagnosis?: ToothDiagnosis): boolean {
  if (!diagnosis) return false;

  const hasSurfaceFindings = diagnosis.surfaceDiagnoses.some(
    (surfaceDiagnosis) =>
      surfaceDiagnosis.icdasScore > 0 ||
      surfaceDiagnosis.nonCariousLesions.length > 0 ||
      Boolean(surfaceDiagnosis.notes?.trim()),
  );

  return Boolean(
    hasSurfaceFindings ||
    (diagnosis.pulpalStatus && diagnosis.pulpalStatus !== "normal") ||
    (diagnosis.periapicalStatus && diagnosis.periapicalStatus !== "normal") ||
    diagnosis.generalNotes?.trim() ||
    diagnosis.evidenceRefs?.length ||
    (typeof diagnosis.painScore === "number" && diagnosis.painScore > 0) ||
    diagnosis.vitalityTests.some((test) => test.result !== "no-realizado"),
  );
}

export function ToothModal({
  tooth,
  isOpen,
  onClose,
  onUpdateGlobalStatus,
}: ToothModalProps) {
  const {
    addClinicalEvent,
    getToothEvents,
    persistPerformedProcedures,
    updateClinicalEvent,
    updateToothDiagnosis,
    deleteClinicalEvent,
    clinicalEvents,
  } = useOdontogramStore();
  const visitId = useOdontogramStore((state) => state.metadata.visitId);
  const { message: antdMessage } = App.useApp();
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
  const [toothDiagnosis, setToothDiagnosis] = useState<ToothDiagnosis>();
  const [plans, setPlans] = useState<ProcedurePlan[]>([]);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedulePlans, setSchedulePlans] = useState<ProcedurePlan[]>([]);
  const surfaceStatesRef = useRef<SurfaceState[]>([]);
  const handleSurfaceStatesChange = useCallback((states: SurfaceState[]) => {
    surfaceStatesRef.current = states;
  }, []);

  const filterDiagnosesForSelectedSurfaces = useCallback(
    (surfaces: ToothSurface[], source: Map<ToothSurface, SurfaceDiagnosis>) => {
      const allowedSurfaces = new Set(surfaces);
      return new Map(
        Array.from(source.entries()).filter(([surface]) =>
          allowedSurfaces.has(surface),
        ),
      );
    },
    [],
  );

  const prunePlansForSelectedSurfaces = useCallback(
    (surfaces: ToothSurface[], source: ProcedurePlan[]) => {
      const allowedSurfaces = new Set(surfaces);

      return source.flatMap((plan) => {
        if (plan.surfaces.length === 0) {
          return [plan];
        }

        const filteredSurfaces = plan.surfaces.filter((surface) =>
          allowedSurfaces.has(surface),
        );

        if (filteredSurfaces.length === 0) {
          return [];
        }

        if (filteredSurfaces.length === plan.surfaces.length) {
          return [plan];
        }

        return [
          {
            ...plan,
            surfaces: filteredSurfaces,
            updatedAt: new Date().toISOString(),
          },
        ];
      });
    },
    [],
  );

  useEffect(() => {
    if (isOpen && tooth) {
      setTempGlobalStatus(tooth.globalStatus);
      setHasUnsavedChanges(false);
      setSaveErrors([]);
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
      tooth.diagnosis?.surfaceDiagnoses.forEach((diagnosis) => {
        surfacesWithEvents.add(diagnosis.surface);
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
      tooth.diagnosis?.surfaceDiagnoses.forEach((diagnosis) => {
        loadedDiagnoses.set(diagnosis.surface, diagnosis);
      });
      events
        .filter((e) => e.type === "diagnosis" && e.icdasScore !== undefined)
        .forEach((event) => {
          event.surfaces.forEach((surface) => {
            loadedDiagnoses.set(surface, {
              surface,
              surfaceRef: event.diagnosisPayload?.surfaceDiagnosis?.surfaceRef,
              icdasScore: event.icdasScore as ICDASScore,
              cariesType: event.diagnosisPayload?.surfaceDiagnosis?.cariesType,
              cariesActivity:
                event.diagnosisPayload?.surfaceDiagnosis?.cariesActivity ||
                "no-aplica",
              nonCariousLesions:
                event.diagnosisPayload?.surfaceDiagnosis?.nonCariousLesions ||
                [],
              findingKind:
                event.diagnosisPayload?.surfaceDiagnosis?.findingKind,
              visualImpact:
                event.diagnosisPayload?.surfaceDiagnosis?.visualImpact,
              notes:
                event.diagnosisPayload?.surfaceDiagnosis?.notes ||
                event.notes ||
                "",
              lastUpdate: event.createdAt,
            });
          });
        });
      setDiagnoses(loadedDiagnoses);

      setToothDiagnosis(
        tooth.diagnosis
          ? {
              ...tooth.diagnosis,
              toothNumber: tooth.number,
              surfaceDiagnoses: Array.from(loadedDiagnoses.values()),
              vitalityTests:
                tooth.diagnosis.vitalityTests?.length > 0
                  ? tooth.diagnosis.vitalityTests
                  : getDefaultVitalityTests(),
              updatedAt: tooth.diagnosis.updatedAt || new Date().toISOString(),
            }
          : undefined,
      );

      // Cargar planes (todos los status, no solo "plan")
      const loadedPlans: ProcedurePlan[] = events
        .filter((e) => e.type === "plan")
        .map((event) => ({
          id: event.id,
          toothNumber: tooth.number,
          surfaces: event.surfaces,
          procedureId: event.procedureId || "custom",
          displayName: event.procedureName || event.notes || "Procedimiento",
          category: event.category || "restaurador",
          status: event.status as ProcedurePlan["status"],
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
  }, [isOpen, tooth, getToothEvents, clinicalEvents.length]);

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

  const handleSurfacesChange = useCallback(
    (nextSurfaces: ToothSurface[]) => {
      if (!tooth) return;

      const sameSelection =
        nextSurfaces.length === selectedSurfaces.length &&
        nextSurfaces.every(
          (surface, index) => surface === selectedSurfaces[index],
        );

      if (sameSelection) {
        return;
      }

      // Only update surface selection. Diagnoses and plans are preserved
      // in their Maps/arrays and filtered at save time, avoiding data loss
      // from transient empty propagations (e.g. React StrictMode double-mount).
      setSelectedSurfaces(nextSurfaces);
      setHasUnsavedChanges(true);
      setSaveErrors([]);
    },
    [selectedSurfaces, tooth],
  );

  if (!tooth) return null;

  const handleStatusClick = (status: ToothGlobalStatus) => {
    if (status !== tempGlobalStatus) {
      setTempGlobalStatus(status);
      setHasUnsavedChanges(true);
      setSaveErrors([]);
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

  const validateBeforeSave = (
    currentDiagnoses: Map<ToothSurface, SurfaceDiagnosis>,
    currentDiagnosisRecord?: ToothDiagnosis,
  ): string[] => {
    const errors: string[] = [];
    const effectiveStatus = tempGlobalStatus;
    const diagnosesToValidate = Array.from(currentDiagnoses.entries())
      .filter(([surface]) => selectedSurfaces.includes(surface))
      .map(([, diagnosis]) => diagnosis);

    if (
      (effectiveStatus === "absent" || effectiveStatus === "implant") &&
      diagnosesToValidate.some(
        (diagnosis) =>
          diagnosis.icdasScore > 0 || diagnosis.nonCariousLesions.length > 0,
      )
    ) {
      errors.push(
        "No se pueden guardar diagnósticos de superficie en dientes ausentes o implantes.",
      );
    }

    diagnosesToValidate.forEach((diagnosis) => {
      if (diagnosis.icdasScore >= 5) {
        if (!diagnosis.cariesType) {
          errors.push(
            `La superficie ${diagnosis.surface} con ICDAS ${diagnosis.icdasScore} requiere tipo de caries.`,
          );
        }

        if (
          !diagnosis.cariesActivity ||
          diagnosis.cariesActivity === "no-aplica"
        ) {
          errors.push(
            `La superficie ${diagnosis.surface} con ICDAS ${diagnosis.icdasScore} requiere actividad de caries.`,
          );
        }

        if (!currentDiagnosisRecord?.pulpalStatus) {
          errors.push(
            `El diente ${tooth.number} requiere estado pulpar cuando existe ICDAS ${diagnosis.icdasScore}.`,
          );
        }

        if (!currentDiagnosisRecord?.periapicalStatus) {
          errors.push(
            `El diente ${tooth.number} requiere estado periapical cuando existe ICDAS ${diagnosis.icdasScore}.`,
          );
        }
      }
    });

    if (
      currentDiagnosisRecord &&
      typeof currentDiagnosisRecord.painScore === "number" &&
      (currentDiagnosisRecord.painScore < 0 ||
        currentDiagnosisRecord.painScore > 10)
    ) {
      errors.push("El dolor NRS debe estar entre 0 y 10.");
    }

    return errors;
  };

  const handleSave = (): boolean => {
    if (!tooth) return false;

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
    console.log("toothDiagnosis (state):", toothDiagnosis);

    onUpdateGlobalStatus(tooth.number, tempGlobalStatus);

    const currentDiagnoses = filterDiagnosesForSelectedSurfaces(
      selectedSurfaces,
      diagnoses,
    );
    const currentPlans = prunePlansForSelectedSurfaces(selectedSurfaces, plans);

    if (currentDiagnoses.size !== diagnoses.size) {
      setDiagnoses(currentDiagnoses);
    }

    if (currentPlans.length !== plans.length) {
      setPlans(currentPlans);
    }

    const currentToothDiagnosis = toothDiagnosis
      ? {
          ...toothDiagnosis,
          toothNumber: tooth.number,
          surfaceDiagnoses: Array.from(currentDiagnoses.values()),
          vitalityTests:
            toothDiagnosis.vitalityTests?.length > 0
              ? toothDiagnosis.vitalityTests
              : getDefaultVitalityTests(),
          updatedAt: new Date().toISOString(),
        }
      : undefined;

    const validationErrors = validateBeforeSave(
      currentDiagnoses,
      currentToothDiagnosis,
    );

    if (validationErrors.length > 0) {
      setSaveErrors(validationErrors);
      setActiveTab("diagnostico");
      console.groupEnd();
      return false;
    }

    setSaveErrors([]);
    console.log(
      "currentDiagnoses (state):",
      currentDiagnoses instanceof Map
        ? Object.fromEntries(currentDiagnoses)
        : currentDiagnoses,
    );

    // Guardar diagnósticos del DiagnosisTab o cargados del store
    const existingSurfaceDiagnosisEvents = getToothEvents(tooth.number).filter(
      (event) =>
        event.type === "diagnosis" &&
        event.level === "surface" &&
        event.surfaces.length > 0,
    );

    existingSurfaceDiagnosisEvents.forEach((event) => {
      const hasAnyTrackedSurface = event.surfaces.some((surface) =>
        currentDiagnoses.has(surface),
      );

      if (!hasAnyTrackedSurface) {
        deleteClinicalEvent(event.id);
      }
    });

    if (currentDiagnoses && currentDiagnoses.size > 0) {
      currentDiagnoses.forEach(
        (diagnosis: SurfaceDiagnosis, surface: ToothSurface) => {
          const existingEvent = getToothEvents(tooth.number).find(
            (e) => e.type === "diagnosis" && e.surfaces.includes(surface),
          );

          if (existingEvent) {
            updateClinicalEvent(existingEvent.id, {
              schemaVersion: 2,
              diagnosisKind: "surface-finding",
              surfacesV2: [
                createSurfaceRef(tooth.number, surface, diagnosis.cariesType),
              ],
              diagnosisPayload: {
                surfaceDiagnosis: {
                  ...diagnosis,
                  surfaceRef: createSurfaceRef(
                    tooth.number,
                    surface,
                    diagnosis.cariesType,
                  ),
                },
              },
              visualState: {
                affectsOdontogram: diagnosis.icdasScore > 0,
                priorityKey:
                  diagnosis.icdasScore > 0
                    ? "surface-diagnosis"
                    : "support-only",
              },
              automationHints: {
                suggestPlan:
                  diagnosis.icdasScore >= 3 ||
                  diagnosis.nonCariousLesions.length > 0,
                urgencyLevel:
                  diagnosis.icdasScore >= 5
                    ? "high"
                    : diagnosis.icdasScore >= 3
                      ? "medium"
                      : "low",
              },
              icdasScore: diagnosis.icdasScore,
              notes: buildSurfaceDiagnosisNotes(diagnosis),
              severity: diagnosis.icdasScore,
            });
          } else {
            addClinicalEvent({
              schemaVersion: 2,
              toothNumber: tooth.number,
              surfaces: [surface],
              surfacesV2: [
                createSurfaceRef(tooth.number, surface, diagnosis.cariesType),
              ],
              level: "surface",
              type: "diagnosis",
              status: "open",
              diagnosisKind: "surface-finding",
              diagnosisPayload: {
                surfaceDiagnosis: {
                  ...diagnosis,
                  surfaceRef: createSurfaceRef(
                    tooth.number,
                    surface,
                    diagnosis.cariesType,
                  ),
                },
              },
              visualState: {
                affectsOdontogram: diagnosis.icdasScore > 0,
                priorityKey:
                  diagnosis.icdasScore > 0
                    ? "surface-diagnosis"
                    : "support-only",
              },
              automationHints: {
                suggestPlan:
                  diagnosis.icdasScore >= 3 ||
                  diagnosis.nonCariousLesions.length > 0,
                urgencyLevel:
                  diagnosis.icdasScore >= 5
                    ? "high"
                    : diagnosis.icdasScore >= 3
                      ? "medium"
                      : "low",
              },
              severity: diagnosis.icdasScore,
              icdasScore: diagnosis.icdasScore,
              notes: buildSurfaceDiagnosisNotes(diagnosis),
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
              schemaVersion: 2,
              diagnosisKind: "surface-finding",
              surfacesV2: [createSurfaceRef(tooth.number, state.surface)],
              diagnosisPayload: {
                surfaceDiagnosis: {
                  surface: state.surface,
                  surfaceRef: createSurfaceRef(tooth.number, state.surface),
                  icdasScore: state.icdasScore,
                  nonCariousLesions: [],
                },
              },
              icdasScore: state.icdasScore,
              notes: `ICDAS ${state.icdasScore}`,
              severity: state.icdasScore,
            });
          } else {
            addClinicalEvent({
              schemaVersion: 2,
              toothNumber: tooth.number,
              surfaces: [state.surface],
              surfacesV2: [createSurfaceRef(tooth.number, state.surface)],
              level: "surface",
              type: "diagnosis",
              status: "open",
              diagnosisKind: "surface-finding",
              diagnosisPayload: {
                surfaceDiagnosis: {
                  surface: state.surface,
                  surfaceRef: createSurfaceRef(tooth.number, state.surface),
                  icdasScore: state.icdasScore,
                  nonCariousLesions: [],
                },
              },
              severity: state.icdasScore,
              icdasScore: state.icdasScore,
              notes: `ICDAS ${state.icdasScore}`,
            });
          }
        }
      }
    });

    const existingPlanEvents = getToothEvents(tooth.number).filter(
      (event) => event.type === "plan",
    );

    existingPlanEvents.forEach((event) => {
      const stillExists = currentPlans.some(
        (plan) =>
          event.procedureId === plan.procedureId &&
          event.surfaces.length === plan.surfaces.length &&
          event.surfaces.every((surface) => plan.surfaces.includes(surface)),
      );

      if (!stillExists) {
        deleteClinicalEvent(event.id);
      }
    });

    if (currentPlans.length > 0) {
      currentPlans.forEach((plan: ProcedurePlan) => {
        const existingPlanEvent = getToothEvents(tooth.number).find(
          (e) =>
            e.type === "plan" &&
            e.procedureId === plan.procedureId &&
            e.surfaces.length === plan.surfaces.length &&
            e.surfaces.every((s) => plan.surfaces.includes(s)),
        );

        const eventNotes = plan.notes?.trim() ? plan.notes : plan.displayName;
        const visualState = buildPlanVisualState(plan);

        if (existingPlanEvent) {
          updateClinicalEvent(existingPlanEvent.id, {
            status: plan.status,
            priority: plan.priority,
            material: plan.material,
            durationMin: plan.durationMin,
            cost: plan.cost,
            notes: eventNotes,
            visualState,
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
            notes: eventNotes,
            visualState,
          });
        }
      });
    }

    if (hasMeaningfulToothDiagnosis(currentToothDiagnosis)) {
      updateToothDiagnosis(tooth.number, currentToothDiagnosis);
    } else {
      updateToothDiagnosis(tooth.number, undefined);
    }

    const currentPulpalStatus = currentToothDiagnosis?.pulpalStatus;
    const existingEndoEvent = getToothEvents(tooth.number).find(
      (e) => e.type === "endo",
    );

    if (currentPulpalStatus && currentPulpalStatus !== "normal") {
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
    } else if (existingEndoEvent) {
      deleteClinicalEvent(existingEndoEvent.id);
    }

    // Resolver diagnósticos de superficies cuyos planes están "done"
    const donePlans = currentPlans.filter((p) => p.status === "done");
    if (donePlans.length > 0) {
      const doneSurfaces = new Set<string>();
      donePlans.forEach((plan) => {
        plan.surfaces.forEach((s) => doneSurfaces.add(s));
      });

      doneSurfaces.forEach((surface) => {
        const diagEvent = getToothEvents(tooth.number).find(
          (e) =>
            e.type === "diagnosis" &&
            e.surfaces.includes(surface as ToothSurface) &&
            e.status !== "done",
        );
        if (diagEvent) {
          updateClinicalEvent(diagEvent.id, {
            status: "done",
            visualState: {
              affectsOdontogram: false,
              priorityKey: "support-only",
            },
          });
        }
      });
    }

    // Limpiar eventos performed de superficies ya no seleccionadas.
    const allowedSurfaces = new Set<ToothSurface>(selectedSurfaces);
    const existingPerformedSurfaceEvents = getToothEvents(tooth.number).filter(
      (event) =>
        event.type === "performed" &&
        event.level === "surface" &&
        event.surfaces.length > 0,
    );

    existingPerformedSurfaceEvents.forEach((event) => {
      const filteredSurfaces = event.surfaces.filter((surface) =>
        allowedSurfaces.has(surface),
      );

      if (filteredSurfaces.length === 0) {
        deleteClinicalEvent(event.id);
        return;
      }

      if (filteredSurfaces.length !== event.surfaces.length) {
        updateClinicalEvent(event.id, {
          surfaces: filteredSurfaces,
          level: "surface",
        });
      }
    });

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
    return true;
  };

  const handleSaveAndClose = () => {
    const saved = handleSave();
    if (saved) {
      onClose();
    }
  };

  const getNextClinicalTab = (): string | null => {
    if (activeTab === "superficies") return "diagnostico";
    if (activeTab === "diagnostico") return "plan";
    if (activeTab === "plan") return "realizado";
    return null;
  };

  const getContinueLabel = () => {
    if (activeTab === "superficies") return "Guardar e ir a diagnóstico";
    if (activeTab === "diagnostico") return "Guardar e ir a plan";
    if (activeTab === "plan") return "Guardar e ir a realizado";
    return "Guardar y cerrar";
  };

  const handleSaveAndContinue = () => {
    const saved = handleSave();
    if (!saved) return;

    const nextTab = getNextClinicalTab();
    if (nextTab) {
      setActiveTab(nextTab);
      return;
    }

    onClose();
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const handleDiagnosesChange = (
    newDiagnoses: Map<ToothSurface, SurfaceDiagnosis>,
  ) => {
    setDiagnoses(newDiagnoses);
    setHasUnsavedChanges(true);
    setSaveErrors([]);
  };

  const handleToothDiagnosisChange = (nextDiagnosis: ToothDiagnosis) => {
    setToothDiagnosis(nextDiagnosis);
    setHasUnsavedChanges(true);
    setSaveErrors([]);
  };

  const handlePlansChange = (newPlans: ProcedurePlan[]) => {
    setPlans(newPlans);
    setHasUnsavedChanges(true);
    setSaveErrors([]);
  };

  const handlePerformedSave = (performed: PerformedProcedure[]) => {
    if (!tooth) return;

    const allowedSurfaces = new Set<ToothSurface>(selectedSurfaces);
    const filteredPerformed = performed
      .map((item) => {
        if (item.surfaces.length === 0) {
          return item;
        }

        const nextSurfaces = item.surfaces.filter((surface) =>
          allowedSurfaces.has(surface),
        );

        if (nextSurfaces.length === 0) {
          return null;
        }

        return {
          ...item,
          surfaces: nextSurfaces,
        };
      })
      .filter((item): item is PerformedProcedure => item !== null);

    persistPerformedProcedures(tooth.number, filteredPerformed);

    setSaveErrors([]);
    setHasUnsavedChanges(false);
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
          onSurfacesChange={handleSurfacesChange}
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
          initialToothDiagnosis={toothDiagnosis}
          onNavigateToTab={handleNavigateToTab}
          onDiagnosesChange={handleDiagnosesChange}
          onToothDiagnosisChange={handleToothDiagnosisChange}
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
          pulpalStatus={toothDiagnosis?.pulpalStatus ?? "normal"}
          initialPlans={plans}
          onNavigateToTab={handleNavigateToTab}
          onPlansChange={handlePlansChange}
          onSchedulePlans={(p) => {
            if (visitId) {
              antdMessage.warning(
                "Hay una cita activa. Finaliza la cita actual para programar nuevos planes.",
              );
              return;
            }
            setSchedulePlans(p);
            setScheduleModalOpen(true);
          }}
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
          onSave={handlePerformedSave}
          onPlansChange={handlePlansChange}
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
    <>
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
                onClick={handleSaveAndContinue}
                className="px-6 py-2 text-sm"
              >
                {getContinueLabel()} →
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
          {saveErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {saveErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </div>

        <OdontogramTabs
          items={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </OdontogramModal>

      <SchedulePlanModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        plans={schedulePlans}
        onScheduled={(updatedPlans) => {
          handlePlansChange(updatedPlans);
          setScheduleModalOpen(false);
        }}
      />
    </>
  );
}
