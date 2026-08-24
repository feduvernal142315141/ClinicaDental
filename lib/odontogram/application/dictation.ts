import type {
  OdontogramDictationMatch,
  OdontogramDictationInconsistency,
  OdontogramDictationOperation,
  OdontogramDictationPatchResponse,
  OdontogramDictationSurface,
  OdontogramDictationSurfaceDiagnosis,
  OdontogramDictationToothDiagnosis,
  ResolveOdontogramInconsistenciesResponse,
  ResolveOdontogramInconsistencyRequest,
} from "@/lib/entity/speech";
import {
  ODONTOGRAM_SCHEMA_VERSION,
  migrateGlobalStatus,
  type OdontogramSnapshot,
  type OdontogramStoreApi,
} from "@/lib/odontogram/store";
import {
  createSurfaceRef,
  type ClinicalEvent,
  type ICDASScore,
  type SurfaceDiagnosis,
  type ToothDiagnosis,
  type ToothGlobalStatus,
  type ToothSurface,
  type VitalityTest,
} from "@/lib/odontogram/domain/odontogram/types";

export interface OdontogramDictationAdapter {
  transcribe: (
    audioBlob: Blob,
    currentContext: Record<string, unknown>,
  ) => Promise<OdontogramDictationPatchResponse>;
  reinterpret: (
    correctedTranscript: string,
    currentContext: Record<string, unknown>,
  ) => Promise<OdontogramDictationPatchResponse>;
  resolveInconsistencies: (
    dictationId: string,
    resolutions: ResolveOdontogramInconsistencyRequest[],
  ) => Promise<ResolveOdontogramInconsistenciesResponse>;
}

export interface OdontogramDictationApplyResult {
  appliedOperations: number;
  affectedTeeth: number[];
  warnings: string[];
}

/**
 * Convierte las opciones ya confirmadas por el usuario en un parche local.
 * No depende de la respuesta del endpoint de aprendizaje.
 *
 * Las aclaraciones descartadas (`candidateId: null`) viajan al backend para
 * cerrarse, pero no aportan ninguna operación: aquí se omiten en silencio.
 */
export function createConfirmedOdontogramDictationPatch(
  dictationId: string,
  inconsistencies: OdontogramDictationInconsistency[],
  resolutions: ResolveOdontogramInconsistencyRequest[],
): OdontogramDictationPatchResponse {
  const resolutionsById = new Map(
    resolutions.map((resolution) => [resolution.inconsistencyId, resolution]),
  );
  const operationsByTooth = new Map<number, OdontogramDictationOperation[]>();
  let sequence = 1;

  inconsistencies.forEach((inconsistency) => {
    const resolution = resolutionsById.get(inconsistency.id);
    if (!resolution || resolution.candidateId === null) return;

    const candidate = inconsistency.candidates.find(
      (item) => item.id === resolution.candidateId,
    );
    const toothChange =
      candidate?.toothChange ??
      (candidate && inconsistency.toothNumber
        ? {
            toothNumber: inconsistency.toothNumber,
            operations: [candidate.operation],
          }
        : undefined);

    if (!candidate || !toothChange || toothChange.operations.length === 0) {
      throw new Error("La aclaración no contiene un cambio aplicable.");
    }

    const operations = operationsByTooth.get(toothChange.toothNumber) ?? [];
    toothChange.operations.forEach((operation) => {
      operations.push({
        ...operation,
        sequence: sequence++,
        confidence: 1,
        requiresConfirmation: false,
      });
    });
    operationsByTooth.set(toothChange.toothNumber, operations);
  });

  return {
    schemaVersion: 1,
    promptVersion: "client-confirmed",
    vocabularyVersion: "learning-pending",
    rawTranscript: inconsistencies
      .map((inconsistency) => inconsistency.sourceText)
      .join("; "),
    toothChanges: Array.from(operationsByTooth, ([toothNumber, operations]) => ({
      toothNumber,
      operations,
    })),
    ambiguities: [],
    dictationId,
    inconsistencies: [],
  };
}

const PATCH_TO_STORE_SURFACE: Record<OdontogramDictationSurface, ToothSurface> = {
  // Los códigos precisos de schema v3 pasan sin pérdida. `mesial`/`distal`
  // siguen traducidos para respuestas antiguas del contrato de dictado.
  mesial: "mesialOclusal",
  distal: "distalOclusal",
  mesialVestibular: "mesialVestibular",
  mesialOclusal: "mesialOclusal",
  mesialLingual: "mesialLingual",
  distalVestibular: "distalVestibular",
  distalOclusal: "distalOclusal",
  distalLingual: "distalLingual",
  facial: "facial",
  facialOclusal: "facialOclusal",
  lingual: "lingual",
  lingualOclusal: "lingualOclusal",
  oclusal: "oclusal",
  cervicalVestibular: "cervicalVestibular",
  cervicalLingual: "cervicalLingual",
};

/**
 * Celda del store → código de superficie del contrato de dictado.
 *
 * Pasa VERBATIM: `ToothSurface` es un subconjunto exacto de
 * `OdontogramDictationSurface`, así que el contexto viaja con la celda v3 real.
 *
 * Antes se proyectaba a la superficie canónica ADA (`mesialOclusal → mesial`), y
 * eso era una pérdida silenciosa en el viaje de vuelta: `PATCH_TO_STORE_SURFACE`
 * reexpande `mesial` a `mesialOclusal`, de modo que decir "quita esa" sobre una
 * lesión `mesialVestibular` habría borrado la celda equivocada. La proyección
 * canónica sigue siendo la correcta para catálogos y facturación, no para
 * señalar una celda concreta de la boca (ver también HU-DICT-018).
 */
function toPatchSurface(surface: ToothSurface): OdontogramDictationSurface {
  return surface;
}

function toPatchGlobalStatus(status: ToothGlobalStatus): string {
  switch (status) {
    case "extraction_indicated":
      return "extraction";
    case "absent":
      return "absent_done";
    default:
      return status;
  }
}

/**
 * Pieza (y caras) con foco AHORA en el modal del diente.
 *
 * Es un dato de INTERACCIÓN, no del snapshot clínico: el módulo lo recibe de su
 * propia UI (ver `OdontogramDictationProvider`), nunca lo lee del host ni lo
 * guarda en el store — el autosave se suscribe a CUALQUIER cambio del store, así
 * que mover el foco dispararía un PUT del odontograma.
 */
export interface OdontogramDictationSelection {
  toothNumber: number;
  /** Vacío cuando el modal está abierto sin ninguna cara seleccionada. */
  surfaces: ToothSurface[];
}

export interface OdontogramDictationContextOptions {
  /** `null`/omitido = no hay modal de diente abierto. No se inventa un foco. */
  lastSelection?: OdontogramDictationSelection | null;
}

/**
 * Tope de eventos recientes que viajan en el contexto.
 *
 * El backend rechaza un `currentOdontogramContext` de más de 100 000 caracteres
 * (`ODONTOGRAM_DICTATION_API.md`). Una boca entera documentada supera de largo
 * los 12 eventos, y la anáfora ("la anterior", "eso que acabo de decir") solo
 * necesita lo último. El estado clínico completo sigue viajando en `teeth`.
 */
const RECENT_EVENTS_LIMIT = 12;

/** Momento de la última escritura del evento; `updatedAt` manda sobre `createdAt`. */
function eventRecency(event: ClinicalEvent): number {
  const stamp = Date.parse(event.updatedAt || event.createdAt || "");
  return Number.isNaN(stamp) ? 0 : stamp;
}

/** Contexto clínico compacto; omite metadatos y campos ajenos a correcciones. */
export function createOdontogramDictationContext(
  snapshot: OdontogramSnapshot,
  options: OdontogramDictationContextOptions = {},
): Record<string, unknown> {
  const relevantTeeth = snapshot.teeth
    .filter((tooth) => tooth.globalStatus !== "healthy" || !!tooth.diagnosis)
    .map((tooth) => ({
      toothNumber: tooth.number,
      globalStatus: toPatchGlobalStatus(tooth.globalStatus),
      toothDiagnosis: tooth.diagnosis
        ? {
            pulpalStatus: tooth.diagnosis.pulpalStatus,
            periapicalStatus: tooth.diagnosis.periapicalStatus,
            vitalityTests: tooth.diagnosis.vitalityTests,
            painScore: tooth.diagnosis.painScore,
            painDescription: tooth.diagnosis.painDescription,
            generalNotes: tooth.diagnosis.generalNotes,
          }
        : undefined,
    }));

  // Los eventos viajan CON su `id` del store: sin él, un "quita lo anterior"
  // no puede apuntar a un evento concreto y la eliminación sería a ciegas.
  // Un evento cancelado se omite a propósito: no debe poder ser "la anterior".
  const recentEvents = snapshot.clinicalEvents
    .filter(
      (event) =>
        event.status !== "canceled" &&
        (event.type === "diagnosis" ||
          event.type === "ausente" ||
          event.type === "implante"),
    )
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        eventRecency(right.event) - eventRecency(left.event) ||
        right.index - left.index,
    )
    .slice(0, RECENT_EVENTS_LIMIT)
    .map(({ event }) => {
      const surfaceDiagnosis = event.diagnosisPayload?.surfaceDiagnosis;
      return {
        id: event.id,
        toothNumber: event.toothNumber,
        type: event.type,
        level: event.level,
        diagnosisKind: event.diagnosisKind,
        surfaces: Array.from(new Set(event.surfaces.map(toPatchSurface))),
        findingKind: surfaceDiagnosis?.findingKind,
        icdasScore: event.icdasScore ?? surfaceDiagnosis?.icdasScore,
      };
    });

  const lastSelection = options.lastSelection
    ? {
        toothNumber: options.lastSelection.toothNumber,
        surfaces: Array.from(
          new Set(options.lastSelection.surfaces.map(toPatchSurface)),
        ),
      }
    : null;

  return {
    odontogramSchemaVersion: snapshot.schemaVersion,
    lastSelection,
    recentEvents,
    teeth: relevantTeeth,
  };
}

export function odontogramPatchRequiresConfirmation(
  patch: OdontogramDictationPatchResponse,
): boolean {
  return patch.toothChanges.some((change) =>
    change.operations.some((operation) => operation.requiresConfirmation),
  );
}

export function countOdontogramPatchOperations(
  patch: OdontogramDictationPatchResponse,
): number {
  return patch.toothChanges.reduce(
    (total, change) => total + change.operations.length,
    0,
  );
}

function operationPriorityKey(
  diagnosis: OdontogramDictationSurfaceDiagnosis,
): string {
  const score = diagnosis.icdasScore;
  if (score === undefined) return "observation";
  if (score >= 5) return "caries-urgent";
  if (score >= 3) return "caries-active";
  if (score >= 1) return "caries-initial";
  return "support-only";
}

function operationUrgency(
  diagnosis: OdontogramDictationSurfaceDiagnosis,
): "low" | "medium" | "high" {
  const score = diagnosis.icdasScore ?? 0;
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function mapSurfaceDiagnosis(
  toothNumber: number,
  surface: ToothSurface,
  operation: OdontogramDictationOperation,
  previous?: Partial<SurfaceDiagnosis>,
): SurfaceDiagnosis {
  const input = operation.diagnosis!;
  const isDefaultedCaries =
    input.findingKind === "caries" &&
    input.icdasScore === undefined &&
    previous?.icdasScore === undefined;
  const icdasScore = (
    input.icdasScore ??
    previous?.icdasScore ??
    (input.findingKind === "caries" ? 1 : 0)
  ) as ICDASScore;
  const icdasSource =
    input.icdasSource ??
    previous?.icdasSource ??
    (isDefaultedCaries ? "dictation-default" : undefined);
  const cariesType = input.cariesType ?? previous?.cariesType;

  return {
    surface,
    surfaceRef: createSurfaceRef(toothNumber, surface, cariesType),
    icdasScore,
    icdasSource,
    cariesType,
    cariesActivity: input.cariesActivity ?? previous?.cariesActivity,
    nonCariousLesions:
      input.nonCariousLesions ?? previous?.nonCariousLesions ?? [],
    findingKind: input.findingKind,
    visualImpact: input.visualImpact ?? previous?.visualImpact ?? "surface",
    notes: input.notes ?? operation.sourceText,
    lastUpdate: new Date().toISOString(),
  };
}

function detachSurfaceFromEvent(
  storeApi: OdontogramStoreApi,
  event: ClinicalEvent,
  removedSurfaces: ReadonlySet<ToothSurface>,
): void {
  const remaining = event.surfaces.filter(
    (surface) => !removedSurfaces.has(surface),
  );

  if (remaining.length === 0) {
    storeApi.getState().deleteClinicalEvent(event.id);
    return;
  }

  storeApi.getState().updateClinicalEvent(event.id, {
    surfaces: remaining,
    surfacesV2: event.surfacesV2?.filter(
      (surfaceRef) =>
        !surfaceRef.legacyCode || !removedSurfaces.has(surfaceRef.legacyCode),
    ),
  });
}

function upsertSurfaceDiagnosis(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): boolean {
  if (!operation.diagnosis || !operation.surfaces?.length) return false;

  operation.surfaces.map((surface) => PATCH_TO_STORE_SURFACE[surface]).forEach(
    (surface) => {
      const state = storeApi.getState();
      let existing = state.clinicalEvents.find(
        (event) =>
          event.toothNumber === toothNumber &&
          event.type === "diagnosis" &&
          event.level === "surface" &&
          event.status !== "canceled" &&
          event.surfaces.includes(surface),
      );

      // Un evento multicaras se separa antes de actualizar una sola celda para
      // no cambiar silenciosamente el diagnóstico de las caras restantes.
      if (existing && existing.surfaces.length > 1) {
        detachSurfaceFromEvent(storeApi, existing, new Set([surface]));
        existing = undefined;
      }

      const diagnosis = mapSurfaceDiagnosis(
        toothNumber,
        surface,
        operation,
        existing?.diagnosisPayload?.surfaceDiagnosis,
      );
      const visualState = {
        affectsOdontogram: diagnosis.visualImpact !== "none",
        priorityKey: operationPriorityKey(operation.diagnosis!),
      };
      const automationHints = {
        suggestPlan:
          diagnosis.icdasScore >= 3 || diagnosis.nonCariousLesions.length > 0,
        urgencyLevel: operationUrgency(operation.diagnosis!),
      };
      const payload = {
        schemaVersion: ODONTOGRAM_SCHEMA_VERSION,
        surfaces: [surface],
        surfacesV2: [
          createSurfaceRef(toothNumber, surface, diagnosis.cariesType),
        ],
        level: "surface" as const,
        type: "diagnosis" as const,
        status: "open" as const,
        diagnosisKind: "surface-finding" as const,
        diagnosisPayload: { surfaceDiagnosis: diagnosis },
        visualState,
        automationHints,
        severity: diagnosis.icdasScore,
        icdasScore: diagnosis.icdasScore,
        notes: diagnosis.notes,
      };

      if (existing) {
        storeApi.getState().updateClinicalEvent(existing.id, payload);
      } else {
        storeApi.getState().addClinicalEvent({ toothNumber, ...payload });
      }
    },
  );

  return true;
}

function eventMatchesSurfaceSelector(
  event: ClinicalEvent,
  match: OdontogramDictationMatch | undefined,
): boolean {
  if (!match) return true;
  const diagnosis = event.diagnosisPayload?.surfaceDiagnosis;
  if (match.eventType && event.type !== match.eventType) return false;
  if (match.diagnosisKind && event.diagnosisKind !== match.diagnosisKind) {
    return false;
  }
  if (match.findingKind && diagnosis?.findingKind !== match.findingKind) {
    return false;
  }
  if (match.icdasScore !== undefined && event.icdasScore !== match.icdasScore) {
    return false;
  }
  if (match.cariesType && diagnosis?.cariesType !== match.cariesType) return false;
  if (
    match.cariesActivity &&
    diagnosis?.cariesActivity !== match.cariesActivity
  ) {
    return false;
  }
  if (
    match.nonCariousLesions?.some(
      (lesion) => !diagnosis?.nonCariousLesions?.includes(lesion),
    )
  ) {
    return false;
  }
  return true;
}

function storedSurfaceMatches(
  stored: ToothSurface,
  requested: ToothSurface,
): boolean {
  if (stored === requested) return true;
  return (
    (stored === "mesial" && requested === "mesialOclusal") ||
    (stored === "distal" && requested === "distalOclusal")
  );
}

function removeSurfaceDiagnosis(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): boolean {
  if (!operation.surfaces?.length) return false;
  const matchingEvents = findMatchingSurfaceEvents(
    storeApi,
    toothNumber,
    operation,
  );

  matchingEvents.forEach((event) => {
    const requested = operation.surfaces!.map(
      (surface) => PATCH_TO_STORE_SURFACE[surface],
    );
    const toRemove = new Set(
      event.surfaces.filter((stored) =>
        requested.some((surface) => storedSurfaceMatches(stored, surface)),
      ),
    );
    detachSurfaceFromEvent(storeApi, event, toRemove);
  });

  return matchingEvents.length > 0;
}

function findMatchingSurfaceEvents(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): ClinicalEvent[] {
  if (!operation.surfaces?.length) return [];
  const requested = operation.surfaces.map(
    (surface) => PATCH_TO_STORE_SURFACE[surface],
  );
  const state = storeApi.getState();
  return state.clinicalEvents.filter(
    (event) =>
      event.toothNumber === toothNumber &&
      event.type === "diagnosis" &&
      event.level === "surface" &&
      event.status !== "canceled" &&
      event.surfaces.some((stored) =>
        requested.some((surface) => storedSurfaceMatches(stored, surface)),
      ) &&
      eventMatchesSurfaceSelector(event, operation.match),
  );
}

function mergeVitalityTests(
  current: VitalityTest[],
  incoming: OdontogramDictationToothDiagnosis["vitalityTests"],
): VitalityTest[] {
  if (!incoming) return current;
  const byType = new Map(current.map((test) => [test.type, test]));
  incoming.forEach((test) => byType.set(test.type, test));
  return Array.from(byType.values());
}

function upsertToothDiagnosis(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): boolean {
  const input = operation.toothDiagnosis;
  if (!input) return false;
  const state = storeApi.getState();
  const current = state.getTooth(toothNumber)?.diagnosis;
  const now = new Date().toISOString();
  const diagnosis: ToothDiagnosis = {
    toothNumber,
    surfaceDiagnoses: current?.surfaceDiagnoses ?? [],
    vitalityTests: mergeVitalityTests(
      current?.vitalityTests ?? [],
      input.vitalityTests,
    ),
    diagnosedDate: current?.diagnosedDate ?? now,
    diagnosedBy: current?.diagnosedBy ?? state.metadata.authorId,
    updatedAt: now,
    ...(current ?? {}),
    ...(input.pulpalStatus !== undefined
      ? { pulpalStatus: input.pulpalStatus }
      : {}),
    ...(input.periapicalStatus !== undefined
      ? { periapicalStatus: input.periapicalStatus }
      : {}),
    ...(input.painScore !== undefined ? { painScore: input.painScore } : {}),
    ...(input.painDescription !== undefined
      ? { painDescription: input.painDescription }
      : {}),
    ...(input.generalNotes !== undefined
      ? { generalNotes: input.generalNotes }
      : {}),
  };
  // Los campos calculados deben prevalecer sobre el spread del diagnóstico actual.
  diagnosis.vitalityTests = mergeVitalityTests(
    current?.vitalityTests ?? [],
    input.vitalityTests,
  );
  diagnosis.updatedAt = now;
  storeApi.getState().updateToothDiagnosis(toothNumber, diagnosis);
  return true;
}

function toothDiagnosisMatches(
  diagnosis: ToothDiagnosis | undefined,
  match: OdontogramDictationMatch | undefined,
): boolean {
  if (!diagnosis) return false;
  if (!match) return true;
  if (match.pulpalStatus && diagnosis.pulpalStatus !== match.pulpalStatus) {
    return false;
  }
  if (
    match.periapicalStatus &&
    diagnosis.periapicalStatus !== match.periapicalStatus
  ) {
    return false;
  }
  if (
    match.vitalityTestType &&
    !diagnosis.vitalityTests.some((test) => test.type === match.vitalityTestType)
  ) {
    return false;
  }
  return true;
}

function removeToothDiagnosis(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): boolean {
  const state = storeApi.getState();
  const current = state.getTooth(toothNumber)?.diagnosis;
  if (!toothDiagnosisMatches(current, operation.match)) return false;
  storeApi.getState().updateToothDiagnosis(toothNumber, undefined);
  return true;
}

function applyOperation(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): boolean {
  const key = `${operation.action}:${operation.target}`;
  switch (key) {
    case "UPSERT:SURFACE_DIAGNOSIS":
      return upsertSurfaceDiagnosis(storeApi, toothNumber, operation);
    case "REMOVE:SURFACE_DIAGNOSIS":
      return removeSurfaceDiagnosis(storeApi, toothNumber, operation);
    case "UPSERT:TOOTH_DIAGNOSIS":
      return upsertToothDiagnosis(storeApi, toothNumber, operation);
    case "REMOVE:TOOTH_DIAGNOSIS":
      return removeToothDiagnosis(storeApi, toothNumber, operation);
    case "SET:TOOTH_GLOBAL_STATUS":
    case "RESET:TOOTH_GLOBAL_STATUS": {
      const status = migrateGlobalStatus(operation.value);
      if (!status) return false;
      storeApi.getState().updateToothGlobalStatus(toothNumber, status);
      return true;
    }
    default:
      return false;
  }
}

function preflightOperation(
  storeApi: OdontogramStoreApi,
  toothNumber: number,
  operation: OdontogramDictationOperation,
): string | null {
  const state = storeApi.getState();
  if (!state.getTooth(toothNumber)) {
    return `La pieza ${toothNumber} no existe en el odontograma actual.`;
  }

  const key = `${operation.action}:${operation.target}`;
  switch (key) {
    case "UPSERT:SURFACE_DIAGNOSIS":
      return operation.diagnosis && operation.surfaces?.length
        ? null
        : `La instrucción ${operation.sequence} no contiene un diagnóstico de superficie completo.`;
    case "REMOVE:SURFACE_DIAGNOSIS": {
      const matches = findMatchingSurfaceEvents(storeApi, toothNumber, operation);
      if (matches.length === 1) return null;
      return matches.length === 0
        ? `La instrucción ${operation.sequence} no coincide con un diagnóstico actual de la pieza ${toothNumber}.`
        : `La instrucción ${operation.sequence} coincide con varios diagnósticos de la pieza ${toothNumber}; no se eliminó ninguno.`;
    }
    case "UPSERT:TOOTH_DIAGNOSIS":
      return operation.toothDiagnosis
        ? null
        : `La instrucción ${operation.sequence} no contiene un diagnóstico integral.`;
    case "REMOVE:TOOTH_DIAGNOSIS":
      return toothDiagnosisMatches(
        state.getTooth(toothNumber)?.diagnosis,
        operation.match,
      )
        ? null
        : `La instrucción ${operation.sequence} no coincide con el diagnóstico integral actual de la pieza ${toothNumber}.`;
    case "SET:TOOTH_GLOBAL_STATUS":
    case "RESET:TOOTH_GLOBAL_STATUS":
      return migrateGlobalStatus(operation.value)
        ? null
        : `La instrucción ${operation.sequence} contiene un estado dental inválido.`;
    default:
      return `La instrucción ${operation.sequence} no usa una operación compatible.`;
  }
}

export function applyOdontogramDictationPatch(
  storeApi: OdontogramStoreApi,
  patch: OdontogramDictationPatchResponse,
): OdontogramDictationApplyResult {
  if (storeApi.getState().readOnly) {
    return {
      appliedOperations: 0,
      affectedTeeth: [],
      warnings: ["El odontograma está en modo de solo lectura."],
    };
  }

  const warnings: string[] = [];
  const affectedTeeth = new Set<number>();
  let appliedOperations = 0;

  const orderedOperations = patch.toothChanges
    .flatMap((change) =>
      change.operations.map((operation) => ({
        toothNumber: change.toothNumber,
        operation,
      })),
    )
    .sort((left, right) => left.operation.sequence - right.operation.sequence);

  // El extractor ya elimina autocorrecciones transitorias. Por ello cada
  // operación debe ser aplicable sobre el snapshot inicial y podemos impedir
  // cualquier mutación si una sola instrucción resulta ambigua o inválida.
  const preflightWarnings = orderedOperations.flatMap(
    ({ toothNumber, operation }) => {
      const warning = preflightOperation(storeApi, toothNumber, operation);
      return warning ? [warning] : [];
    },
  );
  if (preflightWarnings.length > 0) {
    return {
      appliedOperations: 0,
      affectedTeeth: [],
      warnings: preflightWarnings,
    };
  }

  orderedOperations.forEach(({ toothNumber, operation }) => {
    if (applyOperation(storeApi, toothNumber, operation)) {
      appliedOperations += 1;
      affectedTeeth.add(toothNumber);
    } else {
      warnings.push(
        `No se pudo aplicar la instrucción ${operation.sequence} sobre la pieza ${toothNumber}.`,
      );
    }
  });

  return {
    appliedOperations,
    affectedTeeth: Array.from(affectedTeeth),
    warnings,
  };
}
