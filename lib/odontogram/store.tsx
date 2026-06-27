"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import type {
  ClinicalEvent,
  ClinicalEventType,
  PerformedProcedure,
  SurfaceCondition,
  SurfaceTreatment,
  Tooth,
  ToothDiagnosis,
  ToothGlobalStatus,
  ToothSurface,
  TreatmentPlan,
  VitalityTest,
} from "@/components/odontogram/types";
import { OdontogramColorService } from "@/lib/odontogram/domain/odontogram/services/OdontogramColorService";

export const ODONTOGRAM_SCHEMA_VERSION = 2;

export interface OdontogramSnapshotMetadata {
  version: number;
  patientId: string;
  clinicId?: string;
  authorId?: string;
  visitId?: string;
  updatedAt: string;
}

export interface OdontogramSnapshot {
  schemaVersion: number;
  teeth: Tooth[];
  clinicalEvents: ClinicalEvent[];
  treatmentPlans: TreatmentPlan[];
  metadata: OdontogramSnapshotMetadata;
}

export interface OdontogramAdapter {
  load: (
    patientId: string,
    clinicId?: string,
  ) => Promise<OdontogramSnapshot | null | undefined>;
  save: (
    patientId: string,
    snapshot: OdontogramSnapshot,
    clinicId?: string,
  ) => Promise<void>;
  reset?: (patientId: string, clinicId?: string) => Promise<void>;
  loadCatalogs?: () => Promise<unknown>;
}

export interface OdontogramModuleProps {
  patientId: string;
  clinicId?: string;
  adapter: OdontogramAdapter;
  readOnly?: boolean;
  /** Muestra el header del módulo (título + acciones). Default: true. Usar false en modo embebido. */
  showHeader?: boolean;
  initialTab?:
    | "odontogram"
    | "suggestions"
    | "diagnosis"
    | "plans"
    | "performed";
  onChange?: (snapshot: OdontogramSnapshot) => void;
  onError?: (error: unknown) => void;
  finalizeOpen?: boolean;
  onFinalizeClose?: () => void;
  onFinalizeSuccess?: (result: { followUpId?: string }) => void;
}

interface OdontogramState extends OdontogramSnapshot {
  readOnly: boolean;
  replaceSnapshot: (snapshot: OdontogramSnapshot) => void;
  setReadOnly: (readOnly: boolean) => void;
  updateToothGlobalStatus: (
    toothNumber: number,
    status: ToothGlobalStatus,
  ) => void;
  updateToothDiagnosis: (
    toothNumber: number,
    diagnosis?: ToothDiagnosis,
  ) => void;
  addSurfaceTreatment: (
    toothNumber: number,
    treatment: Omit<SurfaceTreatment, "id" | "date">,
  ) => void;
  addSurfaceCondition: (
    toothNumber: number,
    condition: Omit<SurfaceCondition, "id" | "diagnosedDate">,
  ) => void;
  deleteSurfaceCondition: (toothNumber: number, conditionId: string) => void;
  completeTreatment: (toothNumber: number, treatmentId: string) => void;
  deleteTreatment: (toothNumber: number, treatmentId: string) => void;
  addClinicalEvent: (
    event: Omit<ClinicalEvent, "id" | "createdAt" | "updatedAt">,
  ) => string;
  persistPerformedProcedures: (
    toothNumber: number,
    performed: PerformedProcedure[],
  ) => void;
  updateClinicalEvent: (
    eventId: string,
    updates: Partial<ClinicalEvent>,
  ) => void;
  deleteClinicalEvent: (eventId: string) => void;
  createTreatmentPlan: (
    plan: Omit<TreatmentPlan, "id" | "createdDate" | "treatments">,
  ) => void;
  completeTreatmentPlan: (planId: string) => void;
  cancelTreatmentPlan: (planId: string) => void;
  clearAll: () => void;
  getTooth: (toothNumber: number) => Tooth | undefined;
  getToothEvents: (toothNumber: number) => ClinicalEvent[];
  getSurfaceColor: (toothNumber: number, surface: ToothSurface) => string;
  getSnapshot: () => OdontogramSnapshot;
}

export type OdontogramStoreApi = StoreApi<OdontogramState>;

const quadrants = [
  [11, 12, 13, 14, 15, 16, 17, 18],
  [21, 22, 23, 24, 25, 26, 27, 28],
  [31, 32, 33, 34, 35, 36, 37, 38],
  [41, 42, 43, 44, 45, 46, 47, 48],
];

const OdontogramStoreContext = createContext<OdontogramStoreApi | null>(null);

let activeStoreApi: OdontogramStoreApi | null = null;

const nowIso = () => new Date().toISOString();

const getDefaultVitalityTests = (): VitalityTest[] => [
  { type: "frio", result: "no-realizado" },
  { type: "calor", result: "no-realizado" },
  { type: "ept", result: "no-realizado" },
  { type: "percusion-horizontal", result: "no-realizado" },
  { type: "percusion-vertical", result: "no-realizado" },
  { type: "palpacion", result: "no-realizado" },
  { type: "dulce", result: "no-realizado" },
];

const createEmptyDiagnosisRecord = (toothNumber: number): ToothDiagnosis => ({
  toothNumber,
  surfaceDiagnoses: [],
  vitalityTests: getDefaultVitalityTests(),
  diagnosedDate: nowIso(),
  updatedAt: nowIso(),
  completionState: "draft",
});

const dateToEpoch = (isoDate?: string): number => {
  if (!isoDate) return 0;
  const date = new Date(isoDate);
  const epoch = date.getTime();
  return Number.isNaN(epoch) ? 0 : epoch;
};

const pickPreferredEvent = (
  events: ClinicalEvent[],
  preferredVisitId?: string,
): ClinicalEvent | undefined => {
  if (events.length === 0) return undefined;

  const sorted = [...events].sort((a, b) => {
    const aVisitScore =
      preferredVisitId && a.visitId === preferredVisitId ? 1 : 0;
    const bVisitScore =
      preferredVisitId && b.visitId === preferredVisitId ? 1 : 0;

    if (aVisitScore !== bVisitScore) {
      return bVisitScore - aVisitScore;
    }

    return (
      dateToEpoch(b.updatedAt || b.createdAt) -
      dateToEpoch(a.updatedAt || a.createdAt)
    );
  });

  return sorted[0];
};

const syncToothDiagnosisInTeeth = ({
  teeth,
  clinicalEvents,
  toothNumber,
  preferredVisitId,
}: {
  teeth: Tooth[];
  clinicalEvents: ClinicalEvent[];
  toothNumber: number;
  preferredVisitId?: string;
}): Tooth[] =>
  teeth.map((tooth) => {
    if (tooth.number !== toothNumber) {
      return tooth;
    }

    const toothEvents = clinicalEvents.filter(
      (event) => event.toothNumber === toothNumber,
    );

    return {
      ...tooth,
      diagnosis: normalizeToothDiagnosis(
        tooth.number,
        tooth.diagnosis,
        toothEvents,
        preferredVisitId,
      ),
    };
  });

const normalizeToothDiagnosis = (
  toothNumber: number,
  diagnosis?: ToothDiagnosis,
  toothEvents: ClinicalEvent[] = [],
  preferredVisitId?: string,
): ToothDiagnosis | undefined => {
  const baseDiagnosis = diagnosis
    ? {
        ...diagnosis,
        toothNumber,
        vitalityTests:
          diagnosis.vitalityTests?.length > 0
            ? diagnosis.vitalityTests
            : getDefaultVitalityTests(),
        surfaceDiagnoses: diagnosis.surfaceDiagnoses ?? [],
        evidenceRefs: diagnosis.evidenceRefs ?? [],
        completionState: diagnosis.completionState ?? "draft",
        updatedAt: diagnosis.updatedAt ?? diagnosis.diagnosedDate ?? nowIso(),
      }
    : undefined;

  const surfaceDiagnoses = new Map<
    string,
    ToothDiagnosis["surfaceDiagnoses"][0]
  >();

  baseDiagnosis?.surfaceDiagnoses.forEach((surfaceDiagnosis) => {
    surfaceDiagnoses.set(surfaceDiagnosis.surface, surfaceDiagnosis);
  });

  const diagnosisSurfaceEvents = toothEvents.filter(
    (event) =>
      event.type === "diagnosis" &&
      event.surfaces.length > 0 &&
      event.status !== "canceled",
  );

  const eventsBySurface = new Map<ToothSurface, ClinicalEvent[]>();
  diagnosisSurfaceEvents.forEach((event) => {
    event.surfaces.forEach((surface) => {
      const current = eventsBySurface.get(surface) ?? [];
      eventsBySurface.set(surface, [...current, event]);
    });
  });

  eventsBySurface.forEach((events, surface) => {
    const event = pickPreferredEvent(events, preferredVisitId);
    if (!event) return;

    const payloadDiagnosis = event.diagnosisPayload?.surfaceDiagnosis;
    surfaceDiagnoses.set(surface, {
      surface,
      surfaceRef: payloadDiagnosis?.surfaceRef,
      icdasScore: event.icdasScore ?? 0,
      cariesType: payloadDiagnosis?.cariesType,
      cariesActivity: payloadDiagnosis?.cariesActivity,
      nonCariousLesions: payloadDiagnosis?.nonCariousLesions ?? [],
      findingKind: payloadDiagnosis?.findingKind,
      visualImpact:
        payloadDiagnosis?.visualImpact ??
        (event.visualState?.affectsOdontogram ? "surface" : "none"),
      notes: payloadDiagnosis?.notes ?? event.notes,
      lastUpdate: event.updatedAt,
    });
  });

  const toothDiagnosisEvent = pickPreferredEvent(
    toothEvents.filter(
      (event) =>
        event.type === "diagnosis" &&
        event.level === "tooth" &&
        event.diagnosisKind === "tooth-diagnostic" &&
        event.status !== "canceled",
    ),
    preferredVisitId,
  );

  const legacyEndoEvent = pickPreferredEvent(
    toothEvents.filter((event) => event.type === "endo"),
    preferredVisitId,
  );
  const legacyPulpalStatus =
    legacyEndoEvent?.notes?.match(/Estado pulpar: (\w+)/)?.[1];

  const result =
    baseDiagnosis ??
    (surfaceDiagnoses.size > 0 || toothDiagnosisEvent || legacyEndoEvent
      ? createEmptyDiagnosisRecord(toothNumber)
      : undefined);

  if (!result) {
    return undefined;
  }

  result.surfaceDiagnoses = Array.from(surfaceDiagnoses.values());
  result.pulpalStatus =
    toothDiagnosisEvent?.diagnosisPayload?.pulpalStatus ??
    result.pulpalStatus ??
    (legacyPulpalStatus as ToothDiagnosis["pulpalStatus"] | undefined);
  result.periapicalStatus =
    toothDiagnosisEvent?.diagnosisPayload?.periapicalStatus ??
    result.periapicalStatus;
  result.vitalityTests = toothDiagnosisEvent?.diagnosisPayload?.vitalityTests
    ?.length
    ? toothDiagnosisEvent.diagnosisPayload.vitalityTests
    : result.vitalityTests;
  result.painScore =
    toothDiagnosisEvent?.diagnosisPayload?.painScore ?? result.painScore;
  result.painDescription =
    toothDiagnosisEvent?.diagnosisPayload?.painDescription ?? result.painDescription;
  result.generalNotes =
    toothDiagnosisEvent?.diagnosisPayload?.generalNotes ?? result.generalNotes;
  result.evidenceRefs =
    toothDiagnosisEvent?.diagnosisPayload?.evidenceRefs ??
    result.evidenceRefs ??
    [];
  result.updatedAt =
    toothDiagnosisEvent?.updatedAt ?? result.updatedAt ?? nowIso();

  return result;
};

const normalizeClinicalEvent = (event: ClinicalEvent): ClinicalEvent => {
  const normalizedEvent: ClinicalEvent = {
    ...event,
    schemaVersion: event.schemaVersion ?? ODONTOGRAM_SCHEMA_VERSION,
  };

  if (normalizedEvent.visualState) {
    return normalizedEvent;
  }

  const statusFromNotes = normalizedEvent.notes
    ?.replace("Estado global:", "")
    .trim();

  if (
    normalizedEvent.type === "diagnosis" &&
    normalizedEvent.level === "tooth" &&
    statusFromNotes
  ) {
    if (statusFromNotes === "healthy") {
      return {
        ...normalizedEvent,
        visualState: {
          affectsOdontogram: false,
          priorityKey: "healthy",
          colorKey: "healthy",
        },
      };
    }

    if (statusFromNotes === "crown") {
      return {
        ...normalizedEvent,
        visualState: {
          affectsOdontogram: true,
          priorityKey: "crown",
          colorKey: "crown",
          symbolKey: "crown",
        },
      };
    }

    if (statusFromNotes === "absent") {
      return {
        ...normalizedEvent,
        visualState: {
          affectsOdontogram: true,
          priorityKey: "absent",
          colorKey: "absent",
          symbolKey: "extraction",
        },
      };
    }

    if (statusFromNotes === "implant") {
      return {
        ...normalizedEvent,
        visualState: {
          affectsOdontogram: true,
          priorityKey: "implant",
          colorKey: "implant",
          symbolKey: "implant",
        },
      };
    }
  }

  if (
    normalizedEvent.type === "plan" &&
    normalizedEvent.level === "tooth" &&
    normalizedEvent.surfaces.length === 0
  ) {
    return {
      ...normalizedEvent,
      visualState: {
        affectsOdontogram: false,
        priorityKey: "support-only",
      },
    };
  }

  return normalizedEvent;
};

const normalizeTooth = (
  tooth: Tooth,
  clinicalEvents: ClinicalEvent[],
): Tooth => {
  const toothEvents = clinicalEvents.filter(
    (event) => event.toothNumber === tooth.number,
  );

  return {
    ...tooth,
    diagnosis: normalizeToothDiagnosis(
      tooth.number,
      tooth.diagnosis,
      toothEvents,
    ),
  };
};

const initializeTeeth = (): Tooth[] => {
  const allTeeth: Tooth[] = [];

  quadrants.forEach((quadrant) => {
    quadrant.forEach((number) => {
      allTeeth.push({
        number,
        globalStatus: "healthy",
        treatments: [],
        surfaceTreatments: [],
        surfaceConditions: [],
        history: [],
      });
    });
  });

  return allTeeth;
};

export const createEmptySnapshot = ({
  patientId,
  clinicId,
}: {
  patientId: string;
  clinicId?: string;
}): OdontogramSnapshot => ({
  schemaVersion: ODONTOGRAM_SCHEMA_VERSION,
  teeth: initializeTeeth(),
  clinicalEvents: [],
  treatmentPlans: [],
  metadata: {
    version: 1,
    patientId,
    clinicId,
    updatedAt: nowIso(),
  },
});

const normalizeSnapshot = (
  snapshot: OdontogramSnapshot | null | undefined,
  patientId: string,
  clinicId?: string,
): OdontogramSnapshot => {
  const fallback = createEmptySnapshot({ patientId, clinicId });

  if (!snapshot) {
    return fallback;
  }

  const normalizedEvents = (snapshot.clinicalEvents ?? []).map(
    normalizeClinicalEvent,
  );
  const normalizedTeethSource = snapshot.teeth?.length
    ? snapshot.teeth
    : fallback.teeth;

  return {
    schemaVersion: snapshot.schemaVersion ?? ODONTOGRAM_SCHEMA_VERSION,
    teeth: normalizedTeethSource.map((tooth) =>
      normalizeTooth(tooth, normalizedEvents),
    ),
    clinicalEvents: normalizedEvents,
    treatmentPlans: snapshot.treatmentPlans ?? [],
    metadata: {
      version: snapshot.metadata?.version ?? 1,
      patientId,
      clinicId,
      authorId: snapshot.metadata?.authorId,
      visitId: snapshot.metadata?.visitId,
      updatedAt: snapshot.metadata?.updatedAt ?? nowIso(),
    },
  };
};

const buildSnapshot = (state: OdontogramState): OdontogramSnapshot => ({
  schemaVersion: state.schemaVersion,
  teeth: state.teeth,
  clinicalEvents: state.clinicalEvents,
  treatmentPlans: state.treatmentPlans,
  metadata: {
    ...state.metadata,
    updatedAt: nowIso(),
  },
});

const createOdontogramStore = ({
  patientId,
  clinicId,
  readOnly = false,
}: {
  patientId: string;
  clinicId?: string;
  readOnly?: boolean;
}) => {
  const initialSnapshot = createEmptySnapshot({ patientId, clinicId });

  return createStore<OdontogramState>((set, get) => ({
    ...initialSnapshot,
    readOnly,
    replaceSnapshot: (snapshot) => {
      set(() => ({
        ...normalizeSnapshot(
          snapshot,
          get().metadata.patientId,
          get().metadata.clinicId,
        ),
        readOnly: get().readOnly,
      }));
    },
    setReadOnly: (nextReadOnly) => {
      set({ readOnly: nextReadOnly });
    },
    updateToothDiagnosis: (toothNumber, diagnosis) => {
      if (get().readOnly) return;

      set((state) => ({
        teeth: state.teeth.map((tooth) =>
          tooth.number === toothNumber
            ? {
                ...tooth,
                diagnosis,
                history: [
                  ...tooth.history,
                  {
                    id: crypto.randomUUID(),
                    date: nowIso(),
                    action: "Diagnóstico de pieza actualizado",
                    description: diagnosis
                      ? "Se actualizó el diagnóstico estructurado del diente"
                      : "Se eliminó el diagnóstico estructurado del diente",
                  },
                ],
              }
            : tooth,
        ),
      }));

      const toothEvent = get()
        .clinicalEvents.filter(
          (event) =>
            event.type === "diagnosis" &&
            event.level === "tooth" &&
            event.toothNumber === toothNumber &&
            event.diagnosisKind === "tooth-diagnostic",
        )
        .sort((a, b) => dateToEpoch(b.updatedAt) - dateToEpoch(a.updatedAt))[0];

      if (!diagnosis) {
        if (toothEvent) {
          get().deleteClinicalEvent(toothEvent.id);
        }
        return;
      }

      const toothDiagnosisPayload = {
        schemaVersion: ODONTOGRAM_SCHEMA_VERSION,
        diagnosisKind: "tooth-diagnostic" as const,
        diagnosisPayload: {
          pulpalStatus: diagnosis.pulpalStatus,
          periapicalStatus: diagnosis.periapicalStatus,
          vitalityTests: diagnosis.vitalityTests,
          painScore: diagnosis.painScore,
          painDescription: diagnosis.painDescription,
          generalNotes: diagnosis.generalNotes,
          evidenceRefs: diagnosis.evidenceRefs,
        },
        visualState: {
          affectsOdontogram: false,
          priorityKey: "tooth-diagnostic",
        },
        notes: diagnosis.generalNotes,
        status: "open" as const,
      };

      if (toothEvent) {
        get().updateClinicalEvent(toothEvent.id, toothDiagnosisPayload);
      } else {
        get().addClinicalEvent({
          toothNumber,
          surfaces: [],
          level: "tooth",
          type: "diagnosis",
          ...toothDiagnosisPayload,
        });
      }
    },
    updateToothGlobalStatus: (toothNumber, status) => {
      if (get().readOnly) return;

      const currentTooth = get().getTooth(toothNumber);
      const previousStatus = currentTooth?.globalStatus;

      const legacyStatusEvents = get().clinicalEvents.filter(
        (event) =>
          event.toothNumber === toothNumber &&
          event.level === "tooth" &&
          (event.type === "ausente" ||
            event.type === "implante" ||
            (event.type === "diagnosis" &&
              event.notes?.startsWith("Estado global:"))),
      );

      legacyStatusEvents.forEach((event) => {
        get().deleteClinicalEvent(event.id);
      });

      if (previousStatus !== status) {
        set((state) => ({
          teeth: state.teeth.map((tooth) =>
            tooth.number === toothNumber
              ? {
                  ...tooth,
                  globalStatus: status,
                  history: [
                    ...tooth.history,
                    {
                      id: crypto.randomUUID(),
                      date: nowIso(),
                      action: "Estado Global Actualizado",
                      description: `Estado cambiado a: ${status}`,
                    },
                  ],
                }
              : tooth,
          ),
        }));
      }

      if (status === "healthy") {
        return;
      }

      const eventType: ClinicalEventType =
        status === "absent"
          ? "ausente"
          : status === "implant"
            ? "implante"
            : "diagnosis";

      get().addClinicalEvent({
        visitId: get().metadata.visitId,
        toothNumber,
        surfaces: [],
        level: "tooth",
        type: eventType,
        status: "observation",
        authorId: get().metadata.authorId,
        notes: `Estado global: ${status}`,
        visualState:
          status === "crown"
            ? {
                affectsOdontogram: true,
                priorityKey: "crown",
                colorKey: "crown",
                symbolKey: "crown",
              }
            : status === "absent"
              ? {
                  affectsOdontogram: true,
                  priorityKey: "absent",
                  colorKey: "absent",
                  symbolKey: "extraction",
                }
              : status === "implant"
                ? {
                    affectsOdontogram: true,
                    priorityKey: "implant",
                    colorKey: "implant",
                    symbolKey: "implant",
                  }
                : {
                    affectsOdontogram: false,
                    priorityKey: "healthy",
                    colorKey: "healthy",
                  },
      });
    },
    addSurfaceTreatment: (toothNumber, treatment) => {
      if (get().readOnly) return;

      const newTreatment: SurfaceTreatment = {
        ...treatment,
        id: crypto.randomUUID(),
        date: nowIso(),
      };

      set((state) => ({
        teeth: state.teeth.map((tooth) =>
          tooth.number === toothNumber
            ? {
                ...tooth,
                surfaceTreatments: [...tooth.surfaceTreatments, newTreatment],
                history: [
                  ...tooth.history,
                  {
                    id: crypto.randomUUID(),
                    date: nowIso(),
                    action: "Tratamiento Agregado",
                    description: `${treatment.type} en ${treatment.surface}: ${treatment.description}`,
                  },
                ],
              }
            : tooth,
        ),
      }));

      get().addClinicalEvent({
        visitId: get().metadata.visitId,
        toothNumber,
        surfaces: [treatment.surface],
        level: "surface",
        type: "plan",
        status: "plan",
        authorId: get().metadata.authorId,
        notes: `${treatment.type}: ${treatment.description}`,
        priority: "media",
        cost:
          Number.parseFloat(
            treatment.price.toString().replace(/[^0-9.]/g, ""),
          ) || 0,
      });
    },
    addSurfaceCondition: (toothNumber, condition) => {
      if (get().readOnly) return;

      const newCondition: SurfaceCondition = {
        ...condition,
        id: crypto.randomUUID(),
        diagnosedDate: nowIso(),
      };

      set((state) => ({
        teeth: state.teeth.map((tooth) =>
          tooth.number === toothNumber
            ? {
                ...tooth,
                surfaceConditions: [...tooth.surfaceConditions, newCondition],
                history: [
                  ...tooth.history,
                  {
                    id: crypto.randomUUID(),
                    date: nowIso(),
                    action: "Diagnóstico Registrado",
                    description: `${condition.condition} (${condition.severity}) en ${condition.surface}`,
                  },
                ],
              }
            : tooth,
        ),
      }));

      const icdas =
        condition.severity === "severe"
          ? 5
          : condition.severity === "moderate"
            ? 3
            : 1;

      get().addClinicalEvent({
        visitId: get().metadata.visitId,
        toothNumber,
        surfaces: [condition.surface],
        level: "surface",
        type: "diagnosis",
        status: "open",
        authorId: get().metadata.authorId,
        severity: icdas,
        icdasScore: icdas,
        notes: `${condition.condition}${condition.notes ? `: ${condition.notes}` : ""}`,
      });
    },
    deleteSurfaceCondition: (toothNumber, conditionId) => {
      if (get().readOnly) return;

      set((state) => ({
        teeth: state.teeth.map((tooth) =>
          tooth.number === toothNumber
            ? {
                ...tooth,
                surfaceConditions: tooth.surfaceConditions.filter(
                  (condition) => condition.id !== conditionId,
                ),
                history: [
                  ...tooth.history,
                  {
                    id: crypto.randomUUID(),
                    date: nowIso(),
                    action: "Diagnóstico Eliminado",
                    description: "Diagnóstico eliminado",
                  },
                ],
              }
            : tooth,
        ),
      }));
    },
    completeTreatment: (toothNumber, treatmentId) => {
      if (get().readOnly) return;

      const completedDate = nowIso();

      set((state) => ({
        teeth: state.teeth.map((tooth) =>
          tooth.number === toothNumber
            ? {
                ...tooth,
                surfaceTreatments: tooth.surfaceTreatments.map((treatment) =>
                  treatment.id === treatmentId
                    ? {
                        ...treatment,
                        status: "completed",
                        completedDate,
                      }
                    : treatment,
                ),
                history: [
                  ...tooth.history,
                  {
                    id: crypto.randomUUID(),
                    date: completedDate,
                    action: "Tratamiento Completado",
                    description: "Tratamiento completado",
                  },
                ],
              }
            : tooth,
        ),
      }));
    },
    deleteTreatment: (toothNumber, treatmentId) => {
      if (get().readOnly) return;

      set((state) => ({
        teeth: state.teeth.map((tooth) =>
          tooth.number === toothNumber
            ? {
                ...tooth,
                surfaceTreatments: tooth.surfaceTreatments.filter(
                  (treatment) => treatment.id !== treatmentId,
                ),
                history: [
                  ...tooth.history,
                  {
                    id: crypto.randomUUID(),
                    date: nowIso(),
                    action: "Tratamiento Eliminado",
                    description: "Tratamiento eliminado",
                  },
                ],
              }
            : tooth,
        ),
      }));
    },
    addClinicalEvent: (event) => {
      if (get().readOnly) return "";

      const newEvent: ClinicalEvent = {
        ...event,
        schemaVersion: event.schemaVersion ?? ODONTOGRAM_SCHEMA_VERSION,
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      set((state) => {
        const updatedEvents = [...state.clinicalEvents, newEvent];

        return {
          clinicalEvents: updatedEvents,
          teeth: syncToothDiagnosisInTeeth({
            teeth: state.teeth,
            clinicalEvents: updatedEvents,
            toothNumber: newEvent.toothNumber,
            preferredVisitId: state.metadata.visitId,
          }),
        };
      });

      return newEvent.id;
    },
    persistPerformedProcedures: (toothNumber, performed) => {
      if (get().readOnly) return;

      set((state) => {
        const currentToothEvents = state.clinicalEvents.filter(
          (event) => event.toothNumber === toothNumber,
        );

        const performedEvents = currentToothEvents.filter(
          (event) => event.type === "performed",
        );

        const nonPerformedEvents = state.clinicalEvents.filter(
          (event) =>
            !(event.toothNumber === toothNumber && event.type === "performed"),
        );

        const existingPerformedById = new Map(
          performedEvents.map((event) => [event.id, event]),
        );

        const now = nowIso();

        const nextPerformedEvents: ClinicalEvent[] = performed.map((item) => {
          const existingEvent = existingPerformedById.get(item.id);

          // Conserva el símbolo personalizado del servicio al finalizar: lo toma
          // del evento performed previo o, si no, del evento de plan del mismo
          // procedimiento en este diente.
          const symbolSource =
            existingEvent ??
            currentToothEvents.find(
              (e) =>
                !!e.procedureId &&
                e.procedureId === item.procedureId &&
                (!!e.serviceSymbolText || !!e.serviceSymbolUrl),
            );

          return {
            ...(existingEvent ?? {
              id: item.id,
              createdAt: now,
            }),
            serviceSymbolText: symbolSource?.serviceSymbolText,
            serviceSymbolUrl: symbolSource?.serviceSymbolUrl,
            schemaVersion: ODONTOGRAM_SCHEMA_VERSION,
            visitId: item.visitId ?? state.metadata.visitId,
            toothNumber,
            surfaces: item.surfaces,
            level:
              item.surfaces.length > 0
                ? ("surface" as const)
                : ("tooth" as const),
            type: "performed",
            status:
              item.status === "in_progress"
                ? "in_progress"
                : item.status === "canceled"
                  ? "canceled"
                  : "done",
            procedureId: item.procedureId,
            procedureName:
              item.adHocName ||
              existingEvent?.procedureName ||
              (item.procedureId
                ? `Procedimiento ${item.procedureId}`
                : "Procedimiento"),
            durationMin: item.durationMin,
            attachments: item.attachments,
            notes: item.notes,
            authorId: item.operatorId,
            visualState: {
              affectsOdontogram: true,
              priorityKey: "completed",
              symbolKey: "restoration",
            },
            updatedAt: now,
          } as ClinicalEvent;
        });

        const donePlanIds = new Set(
          performed
            .filter((item) => item.status === "done" && item.fromPlanId)
            .map((item) => item.fromPlanId as string),
        );

        const updatedNonPerformedEvents = nonPerformedEvents.map((event) => {
          if (event.type === "plan" && donePlanIds.has(event.id)) {
            return {
              ...event,
              status: "done" as const,
              updatedAt: now,
            };
          }

          return event;
        });

        const updatedEvents = [
          ...updatedNonPerformedEvents,
          ...nextPerformedEvents,
        ];

        return {
          clinicalEvents: updatedEvents,
          teeth: syncToothDiagnosisInTeeth({
            teeth: state.teeth,
            clinicalEvents: updatedEvents,
            toothNumber,
            preferredVisitId: state.metadata.visitId,
          }),
        };
      });
    },
    updateClinicalEvent: (eventId, updates) => {
      if (get().readOnly) return;

      set((state) => {
        const currentEvent = state.clinicalEvents.find(
          (event) => event.id === eventId,
        );
        if (!currentEvent) {
          return {} as Partial<OdontogramState>;
        }

        const nextEvent: ClinicalEvent = {
          ...currentEvent,
          ...updates,
          updatedAt: nowIso(),
        };

        const updatedEvents = state.clinicalEvents.map((event) =>
          event.id === eventId ? nextEvent : event,
        );

        const targetToothNumbers = new Set<number>([
          currentEvent.toothNumber,
          nextEvent.toothNumber,
        ]);

        let nextTeeth = state.teeth;
        targetToothNumbers.forEach((toothNumber) => {
          nextTeeth = syncToothDiagnosisInTeeth({
            teeth: nextTeeth,
            clinicalEvents: updatedEvents,
            toothNumber,
            preferredVisitId: state.metadata.visitId,
          });
        });

        return {
          clinicalEvents: updatedEvents,
          teeth: nextTeeth,
        };
      });
    },
    deleteClinicalEvent: (eventId) => {
      if (get().readOnly) return;

      set((state) => {
        const currentEvent = state.clinicalEvents.find(
          (event) => event.id === eventId,
        );
        if (!currentEvent) {
          return {} as Partial<OdontogramState>;
        }

        const updatedEvents = state.clinicalEvents.filter(
          (event) => event.id !== eventId,
        );

        return {
          clinicalEvents: updatedEvents,
          teeth: syncToothDiagnosisInTeeth({
            teeth: state.teeth,
            clinicalEvents: updatedEvents,
            toothNumber: currentEvent.toothNumber,
            preferredVisitId: state.metadata.visitId,
          }),
        };
      });
    },
    createTreatmentPlan: (plan) => {
      if (get().readOnly) return;

      const newPlan: TreatmentPlan = {
        ...plan,
        id: crypto.randomUUID(),
        createdDate: nowIso(),
        treatments: [],
      };

      set((state) => ({
        treatmentPlans: [...state.treatmentPlans, newPlan],
      }));
    },
    completeTreatmentPlan: (planId) => {
      if (get().readOnly) return;

      set((state) => ({
        treatmentPlans: state.treatmentPlans.map((plan) =>
          plan.id === planId ? { ...plan, status: "completed" } : plan,
        ),
      }));
    },
    cancelTreatmentPlan: (planId) => {
      if (get().readOnly) return;

      set((state) => ({
        treatmentPlans: state.treatmentPlans.map((plan) =>
          plan.id === planId ? { ...plan, status: "cancelled" } : plan,
        ),
      }));
    },
    clearAll: () => {
      if (get().readOnly) return;

      set((state) => ({
        ...createEmptySnapshot({
          patientId: state.metadata.patientId,
          clinicId: state.metadata.clinicId,
        }),
        readOnly: state.readOnly,
      }));
    },
    getTooth: (toothNumber) =>
      get().teeth.find((tooth) => tooth.number === toothNumber),
    getToothEvents: (toothNumber) =>
      get().clinicalEvents.filter((event) => event.toothNumber === toothNumber),
    getSurfaceColor: (toothNumber, surface) =>
      OdontogramColorService.getSurfaceColor(
        toothNumber,
        surface,
        get().clinicalEvents,
      ),
    getSnapshot: () => buildSnapshot(get()),
  }));
};

export function OdontogramStoreProvider({
  patientId,
  clinicId,
  readOnly = false,
  children,
}: {
  patientId: string;
  clinicId?: string;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const storeRef = useRef<OdontogramStoreApi | null>(null);
  const storeKey = useMemo(
    () => `${clinicId ?? "default"}:${patientId}`,
    [clinicId, patientId],
  );

  if (!storeRef.current) {
    storeRef.current = createOdontogramStore({
      patientId,
      clinicId,
      readOnly,
    });
  }

  useEffect(() => {
    if (!storeRef.current) return;
    storeRef.current.getState().setReadOnly(readOnly);
    activeStoreApi = storeRef.current;
  }, [readOnly, storeKey]);

  activeStoreApi = storeRef.current;

  return (
    <OdontogramStoreContext.Provider value={storeRef.current}>
      {children}
    </OdontogramStoreContext.Provider>
  );
}

export function useOdontogramStoreApi() {
  return useContext(OdontogramStoreContext) ?? getActiveStoreApi();
}

function getActiveStoreApi() {
  if (!activeStoreApi) {
    throw new Error(
      "Odontogram store is not available. Wrap the module with OdontogramStoreProvider.",
    );
  }

  return activeStoreApi;
}

type Selector<T> = (state: OdontogramState) => T;

type UseOdontogramStoreHook = {
  <T = OdontogramState>(selector?: Selector<T>): T;
  getState: () => OdontogramState;
  subscribe: OdontogramStoreApi["subscribe"];
};

const identitySelector = (state: OdontogramState) => state;

export const useOdontogramStore = ((selector?: Selector<unknown>) => {
  const storeApi = useOdontogramStoreApi();
  return useStore(storeApi, selector ?? identitySelector);
}) as UseOdontogramStoreHook;

useOdontogramStore.getState = () => getActiveStoreApi().getState();
useOdontogramStore.subscribe = (...args) =>
  getActiveStoreApi().subscribe(...args);

/** Imperative clear-all for host components outside the provider tree. */
export function clearOdontogram() {
  getActiveStoreApi().getState().clearAll();
}
