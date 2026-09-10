export interface TranscribeResponse {
  /** Transcripción literal del audio (Groq Whisper). Siempre presente. */
  rawTranscript: string;
  /** Transcripción SOAP generada por IA cuando fue solicitada. */
  formattedTranscript: string | null;
}

export type OdontogramDictationAction = "UPSERT" | "REMOVE" | "SET" | "RESET";

export type OdontogramDictationTarget =
  | "SURFACE_DIAGNOSIS"
  | "TOOTH_DIAGNOSIS"
  | "TOOTH_GLOBAL_STATUS";

/** Superficies del contrato de dictado; incluye celdas precisas de schema v3. */
export type OdontogramDictationSurface =
  | "mesial"
  | "distal"
  | "mesialVestibular"
  | "mesialOclusal"
  | "mesialLingual"
  | "distalVestibular"
  | "distalOclusal"
  | "distalLingual"
  | "facial"
  | "facialOclusal"
  | "lingual"
  | "lingualOclusal"
  | "oclusal"
  | "cervicalVestibular"
  | "cervicalLingual";

export interface OdontogramDictationSurfaceDiagnosis {
  findingKind: "caries" | "non-carious-lesion" | "support-only";
  icdasScore?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Procedencia server-side del ICDAS para trazabilidad clínica. */
  icdasSource?: "dictated" | "dictation-default";
  cariesType?: "coronal" | "radicular";
  cariesActivity?: "activa" | "inactiva" | "no-aplica";
  nonCariousLesions?: Array<
    "atricion" | "abrasion" | "erosion" | "hipoplasia" | "fisura" | "fractura"
  >;
  visualImpact?: "surface" | "tooth" | "none";
  notes?: string;
}

export interface OdontogramDictationVitalityTest {
  type:
    | "frio"
    | "calor"
    | "ept"
    | "percusion"
    | "percusion-horizontal"
    | "percusion-vertical"
    | "palpacion"
    | "dulce";
  result: "positivo" | "negativo" | "no-realizado";
}

export interface OdontogramDictationToothDiagnosis {
  pulpalStatus?: "normal" | "reversible" | "irreversible" | "necrosis" | "observacion";
  periapicalStatus?: "normal" | "periodontitis-apical" | "absceso" | "quiste";
  vitalityTests?: OdontogramDictationVitalityTest[];
  painScore?: number;
  painDescription?: string;
  generalNotes?: string;
}

export interface OdontogramDictationMatch {
  eventType?: "diagnosis";
  diagnosisKind?: "surface-finding" | "tooth-diagnostic";
  findingKind?: "caries" | "non-carious-lesion" | "support-only";
  icdasScore?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  cariesType?: "coronal" | "radicular";
  cariesActivity?: "activa" | "inactiva" | "no-aplica";
  nonCariousLesions?: Array<
    "atricion" | "abrasion" | "erosion" | "hipoplasia" | "fisura" | "fractura"
  >;
  pulpalStatus?: "normal" | "reversible" | "irreversible" | "necrosis" | "observacion";
  periapicalStatus?: "normal" | "periodontitis-apical" | "absceso" | "quiste";
  vitalityTestType?: OdontogramDictationVitalityTest["type"];
}

export interface OdontogramDictationOperation {
  sequence: number;
  action: OdontogramDictationAction;
  target: OdontogramDictationTarget;
  surfaces?: OdontogramDictationSurface[];
  diagnosis?: OdontogramDictationSurfaceDiagnosis;
  toothDiagnosis?: OdontogramDictationToothDiagnosis;
  match?: OdontogramDictationMatch;
  value?:
    | "healthy"
    | "extraction"
    | "absent_pending"
    | "absent_done"
    | "endodontic"
    | "crown_pending"
    | "crown_done"
    | "implant";
  confidence: number;
  requiresConfirmation: boolean;
  sourceText: string;
}

export interface OdontogramDictationToothChange {
  toothNumber: number;
  operations: OdontogramDictationOperation[];
}

export interface OdontogramDictationAmbiguity {
  code: string;
  message: string;
  toothNumber?: number;
  candidates?: string[];
  sourceText: string;
}

export interface OdontogramDictationCandidate {
  id: string;
  label: string;
  confidence: number;
  operation: OdontogramDictationOperation;
  /** Cambio exacto que el frontend puede aplicar sin esperar otra respuesta. */
  toothChange: OdontogramDictationToothChange;
}

export interface OdontogramDictationInconsistency {
  id: string;
  code: string;
  sourceText: string;
  toothNumber?: number;
  question: string;
  candidates: OdontogramDictationCandidate[];
}

export interface OdontogramDictationPatchResponse {
  schemaVersion: 1;
  promptVersion: string;
  vocabularyVersion: string;
  rawTranscript: string;
  toothChanges: OdontogramDictationToothChange[];
  ambiguities: OdontogramDictationAmbiguity[];
  dictationId?: string | null;
  inconsistencies?: OdontogramDictationInconsistency[];
  transcriptionQuality?: OdontogramTranscriptionQuality;
}

export interface OdontogramTranscriptionWarning {
  code: string;
  message: string;
  startSeconds?: number;
  endSeconds?: number;
}

export interface OdontogramTranscriptionSegment {
  startSeconds?: number;
  endSeconds?: number;
  text: string;
  averageLogProbability?: number;
  noSpeechProbability?: number;
  compressionRatio?: number;
  needsReview: boolean;
}

export interface OdontogramTranscriptionQuality {
  metadataAvailable: boolean;
  needsReview: boolean;
  durationSeconds?: number;
  warnings: OdontogramTranscriptionWarning[];
  segments: OdontogramTranscriptionSegment[];
}

export interface ResolveOdontogramInconsistencyRequest {
  inconsistencyId: string;
  /**
   * Opción elegida por el doctor, o `null` cuando descarta la aclaración: el
   * backend la cierra sin aprender nada de ella. Descartar es una decisión, no
   * un silencio — el backend exige que TODA inconsistencia pendiente viaje en
   * el lote, con su candidato o con `null`.
   */
  candidateId: string | null;
}

export interface ResolveOdontogramInconsistenciesRequest {
  resolutions: ResolveOdontogramInconsistencyRequest[];
}

export interface ResolveOdontogramInconsistenciesResponse {
  dictationId: string;
  resolvedInconsistencyIds: string[];
  dismissedInconsistencyIds: string[];
  learned: boolean;
}

/** Interruptor por clínica del dictado del odontograma (HU-DICT-006). */
export interface OdontogramDictationAvailability {
  enabled: boolean;
}
