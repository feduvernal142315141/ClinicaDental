"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import type {
  ClinicalEvent,
  ClinicalEventType,
  ClinicalEventVisualState,
  PerformedProcedure,
  Tooth,
  ToothDiagnosis,
  ToothGlobalStatus,
  ToothSurface,
  TreatmentPlan,
  VitalityTest,
} from "@/components/odontogram/types";
import { OdontogramColorService } from "@/lib/odontogram/domain/odontogram/services/OdontogramColorService";
import { ClinicalEventStateMachine } from "@/lib/odontogram/domain/odontogram/services/ClinicalEventStateMachine";
import { SYMBOL_COLORS } from "@/lib/odontogram/domain/odontogram/constants/odontogram-colors.constants";
import {
  DEFAULT_TOOTH_NOTATION,
  type ToothNotation,
} from "@/lib/odontogram/notation";
import {
  DEFAULT_DENTITION,
  isDentitionType,
  teethFor,
  type DentitionType,
} from "@/lib/odontogram/domain/odontogram/constants/dentition.constants";

const globalStatusVisualState = (
  status: ToothGlobalStatus,
): ClinicalEventVisualState => {
  switch (status) {
    case "extraction_indicated":
      return {
        affectsOdontogram: false,
        priorityKey: "absent",
        symbolKey: "cross",
        symbolColor: SYMBOL_COLORS.EXTRACTION_INDICATED,
      };
    case "absent":
      return {
        affectsOdontogram: false,
        priorityKey: "absent",
        symbolKey: "cross",
        symbolColor: SYMBOL_COLORS.ABSENT,
      };
    case "endodontic":
      return {
        affectsOdontogram: false,
        priorityKey: "endodontic",
        symbolKey: "endo",
        symbolColor: SYMBOL_COLORS.INK,
      };
    case "crown_pending":
      return {
        affectsOdontogram: false,
        priorityKey: "crown",
        symbolKey: "crown_ring",
        symbolColor: SYMBOL_COLORS.CROWN_PENDING,
      };
    case "crown_done":
      return {
        affectsOdontogram: false,
        priorityKey: "crown",
        symbolKey: "crown_ring",
        symbolColor: SYMBOL_COLORS.CROWN_DONE,
      };
    case "implant":
      return {
        affectsOdontogram: true,
        priorityKey: "implant",
        colorKey: "implant",
        symbolKey: "implant",
      };
    case "healthy":
    default:
      return {
        affectsOdontogram: false,
        priorityKey: "healthy",
        colorKey: "healthy",
      };
  }
};
export const migrateGlobalStatus = (
  raw: string | undefined | null,
): ToothGlobalStatus | null => {
  switch (raw) {
    case "healthy":
    case "extraction_indicated":
    case "absent":
    case "endodontic":
    case "crown_pending":
    case "crown_done":
    case "implant":
      return raw;
    case "extraction":
    case "absent_pending":
      return "extraction_indicated";
    case "absent_done":
      return "absent";
    case "crown":
      return "crown_done";
    default:
      return null;
  }
};
const legacyVisualStateToGlobalStatus = (
  visualState: ClinicalEvent["visualState"],
): ToothGlobalStatus | null => {
  if (!visualState) return null;
  const { colorKey, symbolKey } = visualState;
  if (symbolKey === "endodontics") return "endodontic";
  if (symbolKey === "crown" || symbolKey === "crown_ring") return "crown_done";
  if (symbolKey === "extraction") return "absent";
  if (symbolKey === "implant") return "implant";
  switch (colorKey) {
    case "endodontic":
      return "endodontic";
    case "crown":
      return "crown_done";
    case "absent":
      return "absent";
    case "extraction":
      return "extraction_indicated";
    case "implant":
      return "implant";
    default:
      return null;
  }
};
export const ODONTOGRAM_SCHEMA_VERSION = 4;
export const LEGACY_SURFACE_SCHEMA_VERSION = 2;
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
  // Ausente en el wire = snapshot legado (v<=3): lo resuelve `normalizeSnapshot`.
  dentition?: DentitionType;
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

  currency?: string;
  notation?: ToothNotation;
  defaultDentition?: DentitionType;
  showHeader?: boolean;
  initialTab?:
    | "odontogram"
    | "suggestions"
    | "diagnosis"
    | "plans"
    | "performed";
  onChange?: (snapshot: OdontogramSnapshot) => void;
  onError?: (error: unknown) => void;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  finalizeOpen?: boolean;
  onFinalizeClose?: () => void;
  onFinalizeSuccess?: (result: { followUpId?: string }) => void;
}
interface OdontogramState extends OdontogramSnapshot {
  readOnly: boolean;
  currency: string;
  notation: ToothNotation;
  dentition: DentitionType;
  // Default del host (edad del paciente): presentación, no se persiste.
  defaultDentition: DentitionType;
  replaceSnapshot: (snapshot: OdontogramSnapshot) => void;
  setReadOnly: (readOnly: boolean) => void;
  setCurrency: (currency: string) => void;
  setNotation: (notation: ToothNotation) => void;
  setDentition: (dentition: DentitionType) => void;
  setDefaultDentition: (dentition: DentitionType) => void;
  updateToothGlobalStatus: (
    toothNumber: number,
    status: ToothGlobalStatus,
  ) => void;
  updateToothDiagnosis: (
    toothNumber: number,
    diagnosis?: ToothDiagnosis,
  ) => void;
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
const PERFORMED_CATEGORY_SYMBOL: Record<string, string> = {
  restaurador: "restoration",
  endodoncia: "endodontics",
  protesis: "crown",
  implante: "implant",
  preventivo: "preventive",
  periodoncia: "restoration",
  estetico: "restoration",
  cirugia: "extraction",
};
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

    schemaVersion: event.schemaVersion ?? LEGACY_SURFACE_SCHEMA_VERSION,
  };

  const statusFromNotes = normalizedEvent.notes?.startsWith("Estado global:")
    ? normalizedEvent.notes.replace("Estado global:", "").trim()
    : null;

  if (
    normalizedEvent.level === "tooth" &&
    normalizedEvent.surfaces.length === 0 &&
    statusFromNotes
  ) {
    const mappedStatus = migrateGlobalStatus(statusFromNotes);
    if (mappedStatus) {
      return {
        ...normalizedEvent,
        visualState: globalStatusVisualState(mappedStatus),
      };
    }
  }
  if (
    normalizedEvent.level === "tooth" &&
    normalizedEvent.surfaces.length === 0 &&
    normalizedEvent.visualState
  ) {
    const mappedStatus = legacyVisualStateToGlobalStatus(
      normalizedEvent.visualState,
    );
    if (mappedStatus) {
      return {
        ...normalizedEvent,
        visualState: globalStatusVisualState(mappedStatus),
      };
    }
  }
  if (normalizedEvent.visualState) {
    return normalizedEvent;
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

  if (normalizedEvent.type === "ausente") {
    return {
      ...normalizedEvent,
      visualState: globalStatusVisualState("absent"),
    };
  }
  if (normalizedEvent.type === "implante") {
    return {
      ...normalizedEvent,
      visualState: globalStatusVisualState("implant"),
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
  const globalStatus =
    migrateGlobalStatus(tooth.globalStatus as string) ?? tooth.globalStatus;
  return {
    ...tooth,
    globalStatus,
    diagnosis: normalizeToothDiagnosis(
      tooth.number,
      tooth.diagnosis,
      toothEvents,
    ),
  };
};
const blankTooth = (number: number): Tooth => ({
  number,
  globalStatus: "healthy",
  treatments: [],
  surfaceTreatments: [],
  surfaceConditions: [],
  history: [],
});
const initializeTeeth = (dentition: DentitionType): Tooth[] =>
  teethFor(dentition).map(blankTooth);
// La dentición solo suma espacios: cambiarla nunca borra dientes ya
// registrados (ni sus eventos), solo añade los que falten.
const withTeethFor = (teeth: Tooth[], dentition: DentitionType): Tooth[] => {
  const present = new Set(teeth.map((tooth) => tooth.number));
  const missing = teethFor(dentition)
    .filter((number) => !present.has(number))
    .map(blankTooth);
  return missing.length > 0 ? [...teeth, ...missing] : teeth;
};
export const createEmptySnapshot = ({
  patientId,
  clinicId,
  dentition,
}: {
  patientId: string;
  clinicId?: string;
  dentition?: DentitionType;
}): OdontogramSnapshot => ({
  schemaVersion: ODONTOGRAM_SCHEMA_VERSION,
  dentition,
  teeth: initializeTeeth(dentition ?? DEFAULT_DENTITION),
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
  defaultDentition: DentitionType = DEFAULT_DENTITION,
): OdontogramSnapshot => {
  if (!snapshot) {
    return createEmptySnapshot({
      patientId,
      clinicId,
      dentition: defaultDentition,
    });
  }
  const normalizedEvents = (snapshot.clinicalEvents ?? []).map(
    normalizeClinicalEvent,
  );
  // Un snapshot PERSISTIDO sin dentición es v≤3 por construcción (v4 siempre
  // la serializa) y antes de v4 solo existía la permanente. El vacío de
  // `createEmptySnapshot` sí es v4 sin dentición: ahí manda el default del
  // host. El 4 es literal a propósito: si el esquema sube a 5, un v4 sin
  // dentición debe seguir tomando el default, no "permanent".
  const dentition = isDentitionType(snapshot.dentition)
    ? snapshot.dentition
    : (snapshot.schemaVersion ?? 1) < 4
      ? "permanent"
      : defaultDentition;

  return {
    schemaVersion: ODONTOGRAM_SCHEMA_VERSION,
    dentition,
    teeth: withTeethFor(
      Array.isArray(snapshot.teeth) ? snapshot.teeth : [],
      dentition,
    ).map((tooth) =>
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
  dentition: state.dentition,
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
  currency = "USD",
  notation = DEFAULT_TOOTH_NOTATION,
  defaultDentition = DEFAULT_DENTITION,
}: {
  patientId: string;
  clinicId?: string;
  readOnly?: boolean;
  currency?: string;
  notation?: ToothNotation;
  defaultDentition?: DentitionType;
}) => {
  const initialSnapshot = createEmptySnapshot({
    patientId,
    clinicId,
    dentition: defaultDentition,
  });

  return createStore<OdontogramState>((set, get) => ({
    ...initialSnapshot,
    readOnly,
    currency,
    notation,
    dentition: defaultDentition,
    defaultDentition,
    replaceSnapshot: (snapshot) => {
      set(() => ({
        ...normalizeSnapshot(
          snapshot,
          get().metadata.patientId,
          get().metadata.clinicId,
          get().defaultDentition,
        ),
        readOnly: get().readOnly,
        currency: get().currency,
        notation: get().notation,
        defaultDentition: get().defaultDentition,
      }));
    },
    setReadOnly: (next) => {
      if (get().readOnly === next) return;
      set({ readOnly: next });
    },
    setCurrency: (next) => {
      if (get().currency === next) return;
      set({ currency: next });
    },
    setNotation: (next) => {
      if (get().notation === next) return;
      set({ notation: next });
    },
    setDentition: (next) => {
      if (get().readOnly || get().dentition === next) return;
      set((state) => ({
        dentition: next,
        teeth: withTeethFor(state.teeth, next),
      }));
    },
    setDefaultDentition: (next) => {
      if (get().defaultDentition === next) return;
      set({ defaultDentition: next });
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
        visualState: globalStatusVisualState(status),
      });
    },
    addClinicalEvent: (event) => {
      if (get().readOnly) return "";
      const newEvent: ClinicalEvent = {
        ...event,
        visitId: event.visitId ?? get().metadata.visitId,
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

          const symbolSource =
            existingEvent ??
            currentToothEvents.find(
              (e) =>
                !!e.procedureId &&
                e.procedureId === item.procedureId &&
                (!!e.serviceSymbolText || !!e.serviceSymbolUrl),
            );

          const categorySource =
            currentToothEvents.find(
              (e) =>
                !!e.procedureId &&
                e.procedureId === item.procedureId &&
                !!e.category,
            ) ??
            (item.fromPlanId
              ? currentToothEvents.find(
                  (e) => e.id === item.fromPlanId && !!e.category,
                )
              : undefined);
          const performedCategory = categorySource?.category;
          const performedSymbolKey =
            (performedCategory && PERFORMED_CATEGORY_SYMBOL[performedCategory]) ||
            "restoration";
          return {
            ...(existingEvent ?? {
              id: item.id,
              createdAt: now,
            }),
            serviceSymbolText: symbolSource?.serviceSymbolText,
            serviceSymbolUrl: symbolSource?.serviceSymbolUrl,

            schemaVersion: existingEvent?.schemaVersion ?? ODONTOGRAM_SCHEMA_VERSION,
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
            category: performedCategory ?? existingEvent?.category,
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
            visualState: existingEvent?.preexisting
              ? existingEvent.visualState
              : {
                  affectsOdontogram: true,
                  priorityKey: "completed",
                  symbolKey: performedSymbolKey,
                },
            updatedAt: existingEvent?.preexisting
              ? existingEvent.updatedAt
              : now,
          } as ClinicalEvent;
        });
        const donePlanIds = new Set(
          performed
            .filter((item) => item.status === "done" && item.fromPlanId)
            .map((item) => item.fromPlanId as string),
        );
        const updatedNonPerformedEvents = nonPerformedEvents.map((event) => {
          if (event.type === "plan" && donePlanIds.has(event.id)) {
            return event.status === "done"
              ? event
              : { ...event, status: "done" as const, updatedAt: now };
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
        let nextStatus = updates.status ?? currentEvent.status;
        let safeUpdates = updates;
        if (
          updates.status !== undefined &&
          !ClinicalEventStateMachine.canTransition(
            currentEvent.status,
            updates.status,
          )
        ) {
          console.warn(
            `[odontogram] Transición de estado inválida ignorada: ${currentEvent.status} → ${updates.status} (se conserva el status terminal; el resto de campos se aplica)`,
          );
          nextStatus = currentEvent.status;
          const { status: _status, visualState: _visualState, ...rest } = updates;
          void _status;
          void _visualState;
          safeUpdates = rest;
        }

        const nextEvent: ClinicalEvent = {
          ...currentEvent,
          ...safeUpdates,
          status: nextStatus,
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
          dentition: state.dentition,
        }),
        readOnly: state.readOnly,
        currency: state.currency,
        notation: state.notation,
        defaultDentition: state.defaultDentition,
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
  currency = "USD",
  notation = DEFAULT_TOOTH_NOTATION,
  defaultDentition = DEFAULT_DENTITION,
  children,
}: {
  patientId: string;
  clinicId?: string;
  readOnly?: boolean;
  currency?: string;
  notation?: ToothNotation;
  defaultDentition?: DentitionType;
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
      currency,
      notation,
      defaultDentition,
    });
  }

  useEffect(() => {
    if (!storeRef.current) return;
    storeRef.current.getState().setReadOnly(readOnly);
    storeRef.current.getState().setCurrency(currency);
    storeRef.current.getState().setNotation(notation);
    storeRef.current.getState().setDefaultDentition(defaultDentition);
    activeStoreApi = storeRef.current;
  }, [currency, defaultDentition, notation, readOnly, storeKey]);
  activeStoreApi = storeRef.current;
  useEffect(() => {
    return () => {
      if (activeStoreApi === storeRef.current) {
        activeStoreApi = null;
      }
    };
  }, []);
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

export function clearOdontogram() {
  getActiveStoreApi().getState().clearAll();
}
