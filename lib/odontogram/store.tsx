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

/**
 * Estado visual (relleno/símbolo) por estado global de diente.
 * SOLO 'implant' (morado) rellena la pieza; el resto marca con símbolo
 * (✕/ENDO/anillo) vía canal symbolColor, sin relleno.
 *
 * El eje pendiente/realizado lo lleva el COLOR del mismo glifo —✕ roja para la
 * exodoncia indicada, ✕ azul para la pieza ausente— igual que el anillo de
 * corona. Antes la exodoncia indicada rellenaba la pieza entera de rojo y
 * convivía con dos "ausencias" de colores intercambiados.
 */
const globalStatusVisualState = (
  status: ToothGlobalStatus,
): ClinicalEventVisualState => {
  switch (status) {
    case "extraction_indicated":
      // ✕ ROJA: la pieza sigue en boca, la exodoncia está por hacer.
      return {
        affectsOdontogram: false,
        priorityKey: "absent",
        symbolKey: "cross",
        symbolColor: SYMBOL_COLORS.EXTRACTION_INDICATED,
      };
    case "absent":
      // ✕ AZUL: la pieza ya no está (extraída o agenesia).
      return {
        affectsOdontogram: false,
        priorityKey: "absent",
        symbolKey: "cross",
        symbolColor: SYMBOL_COLORS.ABSENT,
      };
    case "endodontic":
      // Texto "ENDO" neutro, sin relleno.
      return {
        affectsOdontogram: false,
        priorityKey: "endodontic",
        symbolKey: "endo",
        symbolColor: SYMBOL_COLORS.INK,
      };
    case "crown_pending":
      // Anillo ROJO alrededor de toda la pieza (corona por hacer), sin relleno.
      return {
        affectsOdontogram: false,
        priorityKey: "crown",
        symbolKey: "crown_ring",
        symbolColor: SYMBOL_COLORS.CROWN_PENDING,
      };
    case "crown_done":
      // Anillo AZUL alrededor de toda la pieza (corona realizada), sin relleno.
      return {
        affectsOdontogram: false,
        priorityKey: "crown",
        symbolKey: "crown_ring",
        symbolColor: SYMBOL_COLORS.CROWN_DONE,
      };
    case "implant":
      // Sin cambios: letra 'I' + relleno morado.
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

/**
 * Traduce cualquier valor histórico de `globalStatus` al modelo vigente.
 *
 * Punto ÚNICO de migración: lo consumen tanto la rehidratación de dientes
 * guardados como el parseo de notas legacy ("Estado global: X").
 *
 * - 'extraction'     → exodoncia indicada (era la pieza rellena de rojo).
 * - 'absent_pending' → exodoncia indicada: "ausente pendiente" describía una
 *   pieza que SIGUE en boca y está por extraer, que es justo eso.
 * - 'absent_done' / 'absent' → ausente.
 * - 'crown'          → corona realizada.
 */
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

/**
 * Mapea un visualState LEGACY de estado de diente (modelo viejo: relleno
 * rojo/morado/gris + letras E/C) a un ToothGlobalStatus del nuevo modelo, usando
 * sus colorKey/symbolKey. Sirve para migrar datos aún más antiguos que NO traen
 * la nota "Estado global: X". Devuelve null para cualquier visualState que no sea
 * de estado-de-diente (performed/completed, plan/support-only, caries de
 * superficie, sano) → esos NO deben re-derivarse. Sin este mapeo, el símbolo se
 * migraba (alias en ToothSymbolService) pero el RELLENO viejo persistía.
 */
const legacyVisualStateToGlobalStatus = (
  visualState: ClinicalEvent["visualState"],
): ToothGlobalStatus | null => {
  if (!visualState) return null;
  const { colorKey, symbolKey } = visualState;

  // Símbolos del modelo viejo.
  if (symbolKey === "endodontics") return "endodontic";
  if (symbolKey === "crown" || symbolKey === "crown_ring") return "crown_done";
  if (symbolKey === "extraction") return "absent";
  if (symbolKey === "implant") return "implant";

  // Rellenos del modelo viejo (sin símbolo migrable).
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

/**
 * Versión del vocabulario con el que se ESCRIBE un evento clínico.
 *
 * v3 = superficies cualificadas por vista (`mesialVestibular`, `mesialOclusal`,
 * `mesialLingual`…). v2 y anteriores = códigos pelados `mesial`/`distal`.
 *
 * OJO — es un SELLO INFORMATIVO: ningún comportamiento depende de él. La
 * compatibilidad con el registro antiguo se decide siempre por el CÓDIGO de la
 * superficie (`getLegacySurfaceAliases`), nunca por esta versión. El motivo es
 * concreto: `tooth-modal` re-sella la versión sobre eventos que ya existían sin
 * tocar su array `surfaces`, así que un fan-out por versión haría desaparecer
 * hallazgos antiguos en el primer guardado.
 */
export const ODONTOGRAM_SCHEMA_VERSION = 3;

/**
 * Versión que se atribuye a un evento SIN campo `schemaVersion`: si no lo trae,
 * se escribió antes de que existiera el sello, o sea, con el vocabulario viejo.
 * Atribuirle la versión actual sería mentir sobre el registro clínico.
 */
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
  /**
   * Código ISO de la moneda de la clínica (`settings.currency`). Lo inyecta el
   * host: el módulo no conoce ajustes ni servicios. Es SOLO presentación —
   * formatea los importes que ya vienen denominados en esa moneda; NO entra en
   * el snapshot ni convierte nada.
   */
  currency?: string;
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
  /** Autosave del odontograma comenzó (el host puede reflejar "guardando…"). */
  onSaveStart?: () => void;
  /** Autosave del odontograma OK (el host puede reflejar "guardado"). */
  onSaveSuccess?: () => void;
  finalizeOpen?: boolean;
  onFinalizeClose?: () => void;
  onFinalizeSuccess?: (result: { followUpId?: string }) => void;
}

interface OdontogramState extends OdontogramSnapshot {
  readOnly: boolean;
  currency: string;
  replaceSnapshot: (snapshot: OdontogramSnapshot) => void;
  setReadOnly: (readOnly: boolean) => void;
  setCurrency: (currency: string) => void;
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

const quadrants = [
  [11, 12, 13, 14, 15, 16, 17, 18],
  [21, 22, 23, 24, 25, 26, 27, 28],
  [31, 32, 33, 34, 35, 36, 37, 38],
  [41, 42, 43, 44, 45, 46, 47, 48],
];

/**
 * Mapa categoría de procedimiento → symbolKey del odontograma. Permite que un
 * procedimiento REALIZADO muestre su letra clínica (E/C/X/P/I) en lugar de la
 * "R" genérica. Coherente con FDI/ISO 3950.
 */
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
    // Un evento sin sello es antiguo POR DEFINICIÓN: se le atribuye la versión
    // legacy, no la actual. Aquí NO se reescriben sus `surfaces`: la vista de la
    // que salió un `mesial` no quedó registrada y no es deducible, así que
    // repartirlo sería inventar registro clínico. La compatibilidad se resuelve
    // en RENDER (OdontogramColorService, vía getLegacySurfaceAliases).
    schemaVersion: event.schemaVersion ?? LEGACY_SURFACE_SCHEMA_VERSION,
  };

  // Re-derivar SIEMPRE el visualState de los eventos de ESTADO DE DIENTE desde
  // sus notas ("Estado global: X"). Es idempotente para datos nuevos y MIGRA los
  // datos legacy que persistieron el visualState del modelo viejo (E/C + relleno
  // rojo/morado, X gris) al nuevo modelo (ENDO / anillo / ✕ roja-azul sin
  // relleno). Corre ANTES del early-return de visualState existente, porque el
  // dato legacy YA trae un visualState (obsoleto) que hay que reemplazar.
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

  // Cinturón de seguridad SIMÉTRICO: datos aún más antiguos, sin la nota
  // "Estado global: X", traen un visualState legacy (relleno rojo/morado/gris +
  // símbolo E/C). Re-derivar el visualState COMPLETO desde sus colorKey/symbolKey
  // viejos neutraliza tanto el relleno como el símbolo, no solo el símbolo.
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

  // Datos legacy con type ausente/implante pero sin visualState: reconstruirlo
  // con el nuevo modelo (ausente → ✕ azul; implante → relleno morado + 'I').
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

  // Los dientes guardados con modelos anteriores traen valores que ya no
  // existen en el enum ('extraction', 'absent_pending', 'absent_done', 'crown').
  // Se traducen aquí para que el chip de Estado se resalte al reabrir la ficha.
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
  currency = "USD",
}: {
  patientId: string;
  clinicId?: string;
  readOnly?: boolean;
  currency?: string;
}) => {
  const initialSnapshot = createEmptySnapshot({ patientId, clinicId });

  return createStore<OdontogramState>((set, get) => ({
    ...initialSnapshot,
    readOnly,
    currency,
    replaceSnapshot: (snapshot) => {
      set(() => ({
        ...normalizeSnapshot(
          snapshot,
          get().metadata.patientId,
          get().metadata.clinicId,
        ),
        readOnly: get().readOnly,
        currency: get().currency,
      }));
    },
    setReadOnly: (nextReadOnly) => {
      set({ readOnly: nextReadOnly });
    },
    setCurrency: (next) => {
      set({ currency: next });
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
        // Asocia el evento a la visita activa si quien lo crea no lo hizo
        // (trazabilidad por visita; pickPreferredEvent lo usa al rehidratar).
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

          // Categoría del procedimiento (del plan/diagnóstico vinculado) para
          // derivar el símbolo clínico correcto en vez de "R" siempre.
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
            // Solo se sella la versión actual cuando el evento se CREA aquí. Un
            // evento que ya existía conserva la suya: re-sellarlo diría que sus
            // superficies se escribieron con el vocabulario nuevo cuando no es
            // cierto (el array `surfaces` no se toca en esta rama).
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
            visualState: {
              affectsOdontogram: true,
              priorityKey: "completed",
              symbolKey: performedSymbolKey,
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
          // Promueve a 'done' los planes con un performed done vinculado.
          // NO se demota aquí: revertir un plan completado debe ser una enmienda
          // explícita, no un efecto colateral de re-guardar realizados (una lista
          // de performed parcial/filtrada reabriría tratamientos ya completados).
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

        // Guard de máquina de estados: si la transición de status es inválida
        // (revertir un evento terminal done/canceled) NO descartamos el update
        // entero — aplicamos el resto de campos (prioridad, notas, costo…) y
        // CONSERVAMOS el status terminal. La reversión real es vía enmienda
        // (Fase legal). Así editar un plan ya finalizado deja de perder cambios.
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
          // Conservamos el status terminal: descartamos también campos derivados
          // del status (visualState) para no desincronizar status↔color/símbolo.
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
        }),
        readOnly: state.readOnly,
        currency: state.currency,
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
  children,
}: {
  patientId: string;
  clinicId?: string;
  readOnly?: boolean;
  currency?: string;
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
    });
  }

  // El store se crea UNA sola vez, pero el host lee la moneda de un hook de
  // ajustes que arranca en null: el valor real llega DESPUÉS del primer render.
  // Sin esta sincronización la moneda se quedaría congelada en el default.
  useEffect(() => {
    if (!storeRef.current) return;
    storeRef.current.getState().setReadOnly(readOnly);
    storeRef.current.getState().setCurrency(currency);
    activeStoreApi = storeRef.current;
  }, [currency, readOnly, storeKey]);

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
