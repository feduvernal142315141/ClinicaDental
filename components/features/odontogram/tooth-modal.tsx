"use client";

import {
  OdontogramButton,
  OdontogramModal,
  OdontogramTabs,
  ToothStatusChips,
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
  ICDASScore,
  SurfaceState,
  VitalityTest,
} from "./types";
import { createSurfaceRef } from "./types";
import { SURFACE_STATUS_COLORS } from "./types";
import { isToothPhysicallyAbsent } from "@/lib/odontogram/domain/odontogram/constants/tooth-status.constants";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { SurfacesTab } from "./surfaces-tab";
import { DiagnosisTab } from "./diagnosis-tab";
import { PlanTab } from "./plan-tab";
import { PerformedTab } from "./performed-tab";

import { SchedulePlanModal } from "./schedule-plan-modal";
import { useOdontogramStore } from "@/lib/odontogram/store";
import {
  ToothTypeService,
  CariesRiskService,
} from "@/lib/odontogram/domain/odontogram/services";
import { getDesignedToothPaths } from "./teeth-svg-adapter";
import {
  AlertTriangle,
  Lock,
} from "lucide-react";
import { notify } from "@/lib/utils/notify";

interface ToothModalProps {
  tooth: Tooth | null;
  isOpen: boolean;
  /** Cara clicada en la grilla, para preseleccionarla al abrir el modal. */
  initialSurface?: ToothSurface | null;
  onClose: () => void;
  onUpdateGlobalStatus: (
    toothNumber: number,
    status: ToothGlobalStatus,
  ) => void;
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
    { type: "percusion-horizontal", result: "no-realizado" },
    { type: "percusion-vertical", result: "no-realizado" },
    { type: "palpacion", result: "no-realizado" },
    { type: "dulce", result: "no-realizado" },
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
  initialSurface,
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
    readOnly,
  } = useOdontogramStore();
  const odontogramConfirm = useOdontogramConfirm();

  // Riesgo de caries a nivel PACIENTE (CAMBRA/ICCMS lite), calculado desde la
  // carga/actividad de lesiones del odontograma (ya no es un valor fijo "medio").
  const cariesRisk = useMemo(
    () => CariesRiskService.assess(clinicalEvents),
    [clinicalEvents],
  );

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
  const performedProcedures = useMemo(() => {
    if (!tooth) return [];

    return getToothEvents(tooth.number)
      .filter((event) => event.type === "performed")
      .map((event) => ({
        id: event.id,
        visitId: event.visitId,
        toothNumber: tooth.number,
        surfaces: event.surfaces,
        level: event.level === "surface" ? "surface" : "tooth",
        procedureId: event.procedureId,
        adHocName: event.procedureName,
        fromPlanId: event.id.startsWith("performed:")
          ? event.id.slice("performed:".length)
          : undefined,
        status:
          event.status === "in_progress"
            ? "in_progress"
            : event.status === "canceled"
              ? "canceled"
              : "done",
        materials: [],
        durationMin: event.durationMin || 0,
        attachments: event.attachments || [],
        notes: event.notes,
        outcome: "ok",
        operatorId: event.authorId,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      }))
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
  }, [tooth, getToothEvents]);
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

  const initializedToothRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tooth) {
      if (!isOpen) initializedToothRef.current = null;
      return;
    }

    // Re-inicialización COMPLETA (pestaña, estado global, selección) solo al
    // abrir o cambiar de diente. Los cambios de clinicalEvents (autosave) NO
    // deben resetear la pestaña ni borrar selecciones de caras en curso.
    const initKey = `${tooth.number}`;
    const isFirstInitForTooth = initializedToothRef.current !== initKey;
    if (isFirstInitForTooth) {
      initializedToothRef.current = initKey;
      setTempGlobalStatus(tooth.globalStatus);
      setHasUnsavedChanges(false);
      setSaveErrors([]);
      setActiveTab("superficies");
    }

    {
      // Obtener eventos clínicos del diente desde el store
      const events = getToothEvents(tooth.number);

      // Extraer superficies con eventos
      const surfacesWithEvents = new Set<ToothSurface>();
      events.forEach((event) => {
        event.surfaces.forEach((surface) => surfacesWithEvents.add(surface));
      });
      tooth.diagnosis?.surfaceDiagnoses.forEach((diagnosis) => {
        surfacesWithEvents.add(diagnosis.surface);
      });
      const loadedSurfaces = Array.from(surfacesWithEvents);

      // Preselección de la cara clicada en la grilla: solo en la primera
      // inicialización del diente y sin marcar cambios sin guardar (es
      // preselección, no edición). Entra al map de abajo con el mismo shape
      // "healthy" que produce el click manual en SurfaceSelector.
      if (
        isFirstInitForTooth &&
        initialSurface &&
        !surfacesWithEvents.has(initialSurface)
      ) {
        loadedSurfaces.push(initialSurface);
      }

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
            (e.type === "performed" ||
              (e.type === "plan" && e.status === "done")) &&
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

      // En re-sync (mismo diente, cambiaron eventos) preserva las caras que el
      // usuario seleccionó pero aún no tienen evento (p.ej. caras sanas).
      setSelectedSurfaces((prev) =>
        isFirstInitForTooth
          ? loadedSurfaces
          : Array.from(new Set<ToothSurface>([...loadedSurfaces, ...prev])),
      );
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
          durationMin: event.durationMin ?? 0,
          cost: event.cost || 0,
          notes: event.notes,
          // Vínculo plan↔cita: conservar al reabrir para no perder la cita
          // agendada (performed-tab la usa para "citas de hoy").
          appointmentAt: event.appointmentAt,
          appointmentId: event.appointmentId,
          // Conservar el símbolo del servicio al reabrir (si no, el re-guardado
          // lo sobrescribiría con undefined y se perdería).
          serviceSymbolText: event.serviceSymbolText,
          serviceSymbolUrl: event.serviceSymbolUrl,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          authorId: event.authorId,
        }));

      setPlans(loadedPlans);
    }
  }, [isOpen, tooth, getToothEvents, clinicalEvents.length, initialSurface]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        const tabs = ["superficies", "diagnostico", "plan", "realizado"];
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

  // --- Hooks that must be above early return ---
  const performedDot = useMemo(() => {
    const events = tooth ? getToothEvents(tooth.number) : [];
    return events.some((e) => e.type === "performed")
      ? ("green" as const)
      : null;
  }, [tooth, getToothEvents]);

  const headerSvgPaths = useMemo(() => {
    if (!tooth) return null;
    return getDesignedToothPaths(tooth.number, "frontal");
  }, [tooth]);

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
      isToothPhysicallyAbsent(effectiveStatus) &&
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

  // Reúne los errores de validación clínica del estado actual (mismas reglas
  // que el guardado). Se usa como gate ANTES de programar una cita: si el
  // diagnóstico está incompleto no se abre el modal de programación, evitando
  // crear una cita en backend que luego no podría vincularse (cita huérfana).
  const collectValidationErrors = (): string[] => {
    if (!tooth) return [];
    const currentDiagnoses = filterDiagnosesForSelectedSurfaces(
      selectedSurfaces,
      diagnoses,
    );
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
    return validateBeforeSave(currentDiagnoses, currentToothDiagnosis);
  };

  // `plansOverride` permite persistir planes recién actualizados (p.ej. tras
  // programar una cita) sin esperar a que el setState de `plans` se aplique.
  const handleSave = (plansOverride?: ProcedurePlan[]): boolean => {
    if (!tooth) return false;

    const plansSource = plansOverride ?? plans;

    onUpdateGlobalStatus(tooth.number, tempGlobalStatus);

    const currentDiagnoses = filterDiagnosesForSelectedSurfaces(
      selectedSurfaces,
      diagnoses,
    );
    const currentPlans = prunePlansForSelectedSurfaces(
      selectedSurfaces,
      plansSource,
    );

    if (currentDiagnoses.size !== diagnoses.size) {
      setDiagnoses(currentDiagnoses);
    }

    if (currentPlans.length !== plansSource.length) {
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
      return false;
    }

    setSaveErrors([]);

    // Guardar diagnósticos del DiagnosisTab o cargados del store
    const existingSurfaceDiagnosisEvents = getToothEvents(tooth.number).filter(
      (event) =>
        event.type === "diagnosis" &&
        event.level === "surface" &&
        event.surfaces.length > 0,
    );

    existingSurfaceDiagnosisEvents.forEach((event) => {
      // A surface event is orphaned if NONE of its surfaces are still selected.
      // selectedSurfaces is the source of truth — if the user deselected a
      // surface, its events must be removed regardless of diagnosis state.
      const hasAnySelectedSurface = event.surfaces.some((surface) =>
        selectedSurfaces.includes(surface),
      );

      if (!hasAnySelectedSurface) {
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
                // Prioridad derivada de la severidad ICDAS (no 'surface-diagnosis'
                // fijo, que colapsaba 5-6 a 'caries-active').
                priorityKey:
                  diagnosis.icdasScore >= 5
                    ? "caries-urgent"
                    : diagnosis.icdasScore >= 3
                      ? "caries-active"
                      : diagnosis.icdasScore >= 1
                        ? "caries-initial"
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
                // Prioridad derivada de la severidad ICDAS (no 'surface-diagnosis'
                // fijo, que colapsaba 5-6 a 'caries-active').
                priorityKey:
                  diagnosis.icdasScore >= 5
                    ? "caries-urgent"
                    : diagnosis.icdasScore >= 3
                      ? "caries-active"
                      : diagnosis.icdasScore >= 1
                        ? "caries-initial"
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
    // Ids de planes materializados desde plantillas en ESTA pasada, para que el
    // barrido de huérfanos (más abajo) no los borre por no estar aún en `plans`.
    const materializedPlanIds: string[] = [];
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
      } else if (
        state.status === "planned" ||
        state.status === "preventive"
      ) {
        // Materializa como evento de PLAN las plantillas de tratamiento/
        // preventivas aplicadas en la pestaña Superficies (antes se descartaban
        // en silencio al guardar). visitId lo inyecta el store.
        const existingSurfacePlan = getToothEvents(tooth.number).find(
          (e) =>
            e.type === "plan" &&
            e.surfaces.includes(state.surface) &&
            e.status !== "done" &&
            e.status !== "canceled",
        );
        if (!existingSurfacePlan) {
          const newPlanId = addClinicalEvent({
            toothNumber: tooth.number,
            surfaces: [state.surface],
            level: "surface",
            type: "plan",
            status: "plan",
            priority: "media",
            notes:
              state.treatmentType ||
              (state.status === "preventive"
                ? "Preventivo"
                : "Tratamiento planificado"),
            visualState:
              state.status === "preventive"
                ? {
                    affectsOdontogram: true,
                    priorityKey: "preventive",
                    colorKey: "preventive",
                  }
                : {
                    affectsOdontogram: true,
                    priorityKey: "planned",
                    colorKey: "planned",
                  },
          });
          if (newPlanId) materializedPlanIds.push(newPlanId);
        }
      }
    });

    const existingPlanEvents = getToothEvents(tooth.number).filter(
      (event) => event.type === "plan",
    );

    existingPlanEvents.forEach((event) => {
      // No borrar los planes recién materializados desde plantillas (aún no
      // están en `plans`, se cargarán al reabrir).
      if (materializedPlanIds.includes(event.id)) return;

      const stillExists = currentPlans.some(
        (plan) =>
          plan.id === event.id ||
          (event.procedureId === plan.procedureId &&
            event.surfaces.length === plan.surfaces.length &&
            event.surfaces.every((surface) => plan.surfaces.includes(surface))),
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
            (e.id === plan.id ||
              (e.procedureId === plan.procedureId &&
                e.surfaces.length === plan.surfaces.length &&
                e.surfaces.every((s) => plan.surfaces.includes(s)))),
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
            appointmentAt: plan.appointmentAt,
            appointmentId: plan.appointmentId,
            serviceSymbolText: plan.serviceSymbolText,
            serviceSymbolUrl: plan.serviceSymbolUrl,
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
            appointmentAt: plan.appointmentAt,
            appointmentId: plan.appointmentId,
            serviceSymbolText: plan.serviceSymbolText,
            serviceSymbolUrl: plan.serviceSymbolUrl,
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
    if (activeTab === "superficies") return "Continuar a Diagnóstico →";
    if (activeTab === "diagnostico") return "Continuar a Plan →";
    if (activeTab === "plan") return "Continuar a Realizado →";
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

  // --- Compute tab status dots (non-hook, safe after early return) ---
  const surfacesDot = selectedSurfaces.length > 0 ? ("green" as const) : null;
  const diagnosisDot = hasMeaningfulToothDiagnosis(toothDiagnosis)
    ? ("green" as const)
    : diagnoses.size > 0
      ? ("amber" as const)
      : null;
  const planDot = plans.length > 0 ? ("blue" as const) : null;

  const tabItems: OdontogramTabItem[] = [
    {
      key: "superficies",
      label: "Superficies",
      statusDot: surfacesDot,
      children: (
        <SurfacesTab
          tooth={tooth}
          initialSurfaces={selectedSurfaces}
          initialSurfaceStates={initialSurfaceStates}
          readOnly={readOnly}
          onNavigateToTab={handleNavigateToTab}
          onSurfacesChange={handleSurfacesChange}
          onSurfaceStatesChange={handleSurfaceStatesChange}
        />
      ),
    },
    {
      key: "diagnostico",
      label: "Diagnóstico (ICDAS)",
      statusDot: diagnosisDot,
      children: (
        <DiagnosisTab
          tooth={tooth}
          selectedSurfaces={selectedSurfaces}
          initialDiagnoses={diagnoses}
          initialToothDiagnosis={toothDiagnosis}
          patientRisk={cariesRisk.level}
          patientRiskReasons={cariesRisk.reasons}
          onNavigateToTab={handleNavigateToTab}
          onDiagnosesChange={handleDiagnosesChange}
          onToothDiagnosisChange={handleToothDiagnosisChange}
        />
      ),
    },
    {
      key: "plan",
      label: "Plan",
      statusDot: planDot,
      children: (
        <PlanTab
          tooth={tooth}
          selectedSurfaces={selectedSurfaces}
          diagnoses={diagnoses}
          pulpalStatus={toothDiagnosis?.pulpalStatus ?? "normal"}
          initialPlans={plans}
          patientRisk={cariesRisk.level}
          patientRiskReasons={cariesRisk.reasons}
          onNavigateToTab={handleNavigateToTab}
          onPlansChange={handlePlansChange}
          onSchedulePlans={(p) => {
            // Programar una cita de seguimiento es válido DURANTE la consulta
            // activa (es cuando el clínico planifica el tratamiento futuro).
            // El odontograma solo es editable con una visita activa, así que
            // bloquear aquí por `visitId` dejaba el botón inalcanzable. La cita
            // futura se crea con su propio id, independiente del visitId actual.
            // Solo hay algo que agendar si queda algún plan sin cita vinculada.
            const anySchedulable = p.some(
              (pl) =>
                pl.status !== "done" &&
                pl.status !== "canceled" &&
                pl.status !== "scheduled" &&
                !pl.appointmentId,
            );
            if (!anySchedulable) {
              notify.info("Sin planes por agendar", {
                description:
                  "Todos los procedimientos de este diente ya están agendados o realizados.",
              });
              return;
            }
            // Gate: programar crea la cita en backend. Si el diagnóstico está
            // incompleto, el guardado posterior fallaría y la cita quedaría
            // huérfana; validamos antes de abrir el modal de programación.
            const validationErrors = collectValidationErrors();
            if (validationErrors.length > 0) {
              setSaveErrors(validationErrors);
              setActiveTab("diagnostico");
              notify.warning("Completa el diagnóstico", {
                description:
                  "Corrige los datos pendientes antes de programar la cita.",
              });
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
      statusDot: performedDot,
      children: (
        <PerformedTab
          tooth={tooth}
          selectedSurfaces={selectedSurfaces}
          plans={plans}
          performed={performedProcedures}
          readOnly={readOnly}
          patientRisk={cariesRisk.level}
          patientRiskReasons={cariesRisk.reasons}
          onNavigateToTab={handleNavigateToTab}
          onSave={handlePerformedSave}
          onPlansChange={handlePlansChange}
        />
      ),
    },
  ];

  // --- Top banner ---
  const topBanner = (() => {
    if (readOnly) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-hover border border-hairline px-4 py-2.5 text-xs text-subtle">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">Solo lectura</span>
          <span className="text-subtle">—</span>
          <span>Inicia una consulta para editar este diente</span>
        </div>
      );
    }
    if (hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-400/25 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">Cambios sin guardar</span>
          <span className="text-amber-600 dark:text-amber-300">—</span>
          <span>Guarda antes de cerrar para no perder tu trabajo</span>
        </div>
      );
    }
    return null;
  })();

  return (
    <>
      <OdontogramModal
        open={isOpen}
        onClose={handleClose}
        title={
          <div className="flex items-center gap-3">
            {/* SVG thumbnail */}
            {headerSvgPaths && (
              <div className="shrink-0 w-10 h-14 flex items-center justify-center text-subtle">
                <svg
                  viewBox={headerSvgPaths.viewBox}
                  className="w-full h-full drop-shadow-sm"
                  aria-hidden="true"
                >
                  {/* Outline */}
                  <path
                    d={headerSvgPaths.outline}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={0.8}
                  />
                  {/* Surfaces */}
                  {headerSvgPaths.surfaces.map((sp, i) => (
                    <path
                      key={i}
                      d={sp.d}
                      className="fill-slate-200 dark:fill-slate-700"
                      stroke="currentColor"
                      strokeWidth={0.3}
                    />
                  ))}
                  {/* Roots */}
                  {headerSvgPaths.roots.map((r, i) => (
                    <path
                      key={`r-${i}`}
                      d={r}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={0.5}
                    />
                  ))}
                </svg>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight tabular-nums">
                Diente {tooth.number}
              </span>
              <span className="text-xs text-subtle font-normal">
                {getToothDescription(tooth.number)}
              </span>
            </div>
          </div>
        }
        topBanner={topBanner}
        footer={
          readOnly ? (
            <div className="flex justify-end pt-3 border-t">
              <OdontogramButton
                variant="outline"
                onClick={onClose}
                className="px-6"
              >
                Cerrar
              </OdontogramButton>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-4 pt-3 border-t">
              <OdontogramButton
                variant="outline"
                onClick={handleClose}
                className="px-6"
              >
                Cancelar
              </OdontogramButton>
              <div className="flex gap-3">
                <OdontogramButton
                  variant="primary"
                  onClick={handleSaveAndClose}
                  className="px-6"
                >
                  Guardar
                </OdontogramButton>
                <OdontogramButton
                  variant="primary"
                  onClick={handleSaveAndContinue}
                  className="px-6"
                >
                  {getContinueLabel()}
                </OdontogramButton>
              </div>
            </div>
          )
        }
      >
        {/* Compact global status bar */}
        <div className="flex items-center gap-3 pb-3 mb-1 border-b">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            Estado:
          </span>
          <ToothStatusChips
            value={tempGlobalStatus}
            onChange={handleStatusClick}
            readOnly={readOnly}
          />
          {saveErrors.length > 0 && (
            <div className="ml-auto rounded-md border border-rose-400/25 bg-rose-500/15 px-3 py-1 text-xs text-rose-600 dark:text-rose-300">
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
          // La cita ya existe en backend: persistir el vínculo de inmediato
          // para que no quede huérfana si el usuario cierra sin guardar.
          // updatedPlans ya trae appointmentId/appointmentAt por plan.
          setPlans(updatedPlans);
          const saved = handleSave(updatedPlans);
          if (!saved) {
            // Red de seguridad: el gate previo ya validó, pero si el guardado
            // falla aquí no descartamos el vínculo en silencio — marcamos
            // cambios sin guardar para que el cierre pida confirmación y avisamos.
            setHasUnsavedChanges(true);
            notify.warning("Cita creada sin vincular", {
              description:
                "Completa el diagnóstico y guarda para vincular la cita a los planes.",
            });
          }
          setScheduleModalOpen(false);
        }}
      />
    </>
  );
}
