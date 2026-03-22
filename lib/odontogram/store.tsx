"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import type {
  ClinicalEvent,
  ClinicalEventType,
  SurfaceCondition,
  SurfaceTreatment,
  Tooth,
  ToothGlobalStatus,
  ToothSurface,
  TreatmentPlan,
} from "@/components/odontogram/types";
import { OdontogramColorService } from "@/lib/odontogram/domain/odontogram/services/OdontogramColorService";

export interface OdontogramSnapshotMetadata {
  version: number;
  patientId: string;
  clinicId?: string;
  authorId?: string;
  visitId?: string;
  updatedAt: string;
}

export interface OdontogramSnapshot {
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
  initialTab?: "odontogram" | "diagnosis" | "plans" | "performed";
  onChange?: (snapshot: OdontogramSnapshot) => void;
  onError?: (error: unknown) => void;
}

interface OdontogramState extends OdontogramSnapshot {
  readOnly: boolean;
  replaceSnapshot: (snapshot: OdontogramSnapshot) => void;
  setReadOnly: (readOnly: boolean) => void;
  updateToothGlobalStatus: (
    toothNumber: number,
    status: ToothGlobalStatus,
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

  return {
    teeth: snapshot.teeth?.length ? snapshot.teeth : fallback.teeth,
    clinicalEvents: snapshot.clinicalEvents ?? [],
    treatmentPlans: snapshot.treatmentPlans ?? [],
    metadata: {
      version: 1,
      patientId,
      clinicId,
      authorId: snapshot.metadata?.authorId,
      visitId: snapshot.metadata?.visitId,
      updatedAt: snapshot.metadata?.updatedAt ?? nowIso(),
    },
  };
};

const buildSnapshot = (state: OdontogramState): OdontogramSnapshot => ({
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
    updateToothGlobalStatus: (toothNumber, status) => {
      if (get().readOnly) return;

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
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      set((state) => ({
        clinicalEvents: [...state.clinicalEvents, newEvent],
      }));

      return newEvent.id;
    },
    updateClinicalEvent: (eventId, updates) => {
      if (get().readOnly) return;

      set((state) => ({
        clinicalEvents: state.clinicalEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                ...updates,
                updatedAt: nowIso(),
              }
            : event,
        ),
      }));
    },
    deleteClinicalEvent: (eventId) => {
      if (get().readOnly) return;

      set((state) => ({
        clinicalEvents: state.clinicalEvents.filter(
          (event) => event.id !== eventId,
        ),
      }));
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
