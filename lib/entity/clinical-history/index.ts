/**
 * Clinical History Entity Types
 *
 * Type definitions for clinical history module (Phase 1 + Fase A odontogram enrichment)
 */

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export type AlertSeverity = "critical" | "warning" | "info";

export type TreatmentStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

// ---------------------------------------------------------------------------
// Snapshot sub-types
// ---------------------------------------------------------------------------

export interface ClinicalHistoryAlert {
  id: string;
  message: string;
  severity: AlertSeverity;
}

export interface ClinicalHistoryPatientHeader {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  bloodType?: string;
  insurancePlan?: string;
  emergencyContact?: string;
  alerts: ClinicalHistoryAlert[];
  lastVisit?: string;
  nextAppointment?: string;
}

// ---------------------------------------------------------------------------
// Odontogram-integration types (Fase A — cross-cutting contract)
// ---------------------------------------------------------------------------

/**
 * Referencia anatómica a un diente (notación FDI/ISO 3950) con cara opcional.
 * Usada tanto en diagnósticos como en el dolor actual.
 */
export interface ToothRef {
  /** Número FDI del diente, p.ej. "16", "46". */
  fdi: string;
  /** Nombre de superficie, p.ej. "mesial", "oclusal". Opcional. */
  surface?: string;
}

/** Estado de un diagnóstico clínico. */
export type DiagnosisStatus = "provisional" | "confirmed";

/** Origen del diagnóstico (entrada manual vs. sugerencia del odontograma). */
export type DiagnosisSource = "manual" | "odontogram";

/**
 * Diagnóstico estructurado CIE-10 asociado a una visita.
 * Compatible con el contrato cross-cutting del backend (PatientVisitRecord.diagnoses).
 */
export interface VisitDiagnosis {
  /** Código CIE-10, p.ej. "K02.1". */
  code: string;
  /** Etiqueta en español del diagnóstico. */
  label: string;
  status: DiagnosisStatus;
  /** Diente y cara asociados (procedente del odontograma o selección manual). */
  toothRef?: ToothRef;
  source?: DiagnosisSource;
}

/** Hallazgos extraorales estructurados (flexible JSON). */
export interface ExamFindingsExtraoral {
  facialAsymmetry?: string;
  tmjNotes?: string;
  lymphNodes?: string;
  lips?: string;
  other?: string;
}

/** Hallazgos intraorales estructurados (flexible JSON). */
export interface ExamFindingsIntraoral {
  softTissue?: string;
  hardTissue?: string;
  periodontium?: string;
  occlusion?: string;
  hygiene?: string;
  other?: string;
}

/**
 * Hallazgos del examen clínico de la visita.
 * Compatible con el contrato cross-cutting del backend (PatientVisitRecord.examFindings).
 */
export interface ExamFindings {
  extraoral?: ExamFindingsExtraoral;
  intraoral?: ExamFindingsIntraoral;
}

// ---------------------------------------------------------------------------
// Pre-existing types (keep intact)
// ---------------------------------------------------------------------------

export interface CurrentPain {
  location?: string;
  intensity?: number;
  type?: string;
  duration?: string;
}

export interface ClinicalHistoryMedicalHistory {
  occupation?: string;
  maritalStatus?: string;
  systemicDiseases: string[];
  currentMedications: string[];
  allergies: string[];
  previousSurgeries: string[];
  chiefComplaint?: string;
  habits: string[];
  currentPain?: CurrentPain;
  lastDentalVisit?: string;
  isValidated: boolean;
  validatedAt?: string;
  validatedBy?: string;
  clinicalNotes?: string;
  clinicalNotesUpdatedAt?: string;
  clinicalNotesUpdatedBy?: string;
}

export interface ClinicalHistoryTreatment {
  id: string;
  teeth: string[];
  procedure: string;
  diagnosis?: string;
  status: TreatmentStatus;
  serviceName?: string;
  cost?: number;
  date?: string;
}

export interface ClinicalHistoryTreatmentPlan {
  id: string;
  name: string;
  description?: string;
  totalTreatments: number;
  completedTreatments: number;
  status: TreatmentStatus;
  treatments: ClinicalHistoryTreatment[];
}

export interface ClinicalHistorySummary {
  activeTreatments: number;
  pendingTreatments: number;
  completedTreatments: number;
  criticalTeeth: string[];
  lastVisit?: string;
  nextAppointment?: string;
  mainDiagnoses: string[];
}

// ---------------------------------------------------------------------------
// Snapshot (root response)
// ---------------------------------------------------------------------------

export interface ClinicalHistorySnapshot {
  patientHeader: ClinicalHistoryPatientHeader;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  treatments: ClinicalHistoryTreatment[];
  treatmentPlans: ClinicalHistoryTreatmentPlan[];
  summary: ClinicalHistorySummary;
}

// ---------------------------------------------------------------------------
// Visit Record types (HU-CLIN-005)
// ---------------------------------------------------------------------------

/** Anamnesis congelada al completar la cita (null en visitas legacy pre-F3). */
export interface VisitMedicalSnapshot {
  allergies?: string[];
  currentMedications?: string[];
  systemicDiseases?: string[];
  previousSurgeries?: string[];
  habits?: string[];
  occupation?: string;
  maritalStatus?: string;
  bloodType?: string;
  insurancePlan?: string;
  lastDentalVisit?: string;
  validated?: boolean;
  capturedAt?: string;
}

export interface PatientVisitRecord {
  appointmentId: string;
  patientId: string;
  chiefComplaint?: string;
  currentPain?: {
    location?: string;
    intensity?: number;
    type?: string;
    duration?: string;
    /** Referencia anatómica del dolor (procedente del odontograma). */
    toothRef?: ToothRef;
  };
  /** Snapshot inmutable de la anamnesis al momento de la visita. */
  medicalSnapshot?: VisitMedicalSnapshot | null;
  clinicalNotes?: string;
  clinicalNotesUpdatedAt?: string;
  clinicalNotesUpdatedBy?: string;
  /** Diagnósticos CIE-10 estructurados de la visita (Fase A). */
  diagnoses?: VisitDiagnosis[];
  /** Hallazgos del examen clínico de la visita (Fase A). */
  examFindings?: ExamFindings;
}

export interface UpsertVisitRecordRequest {
  chiefComplaint?: string;
  currentPain?: {
    location?: string;
    intensity?: number | null;
    type?: string;
    duration?: string;
    /** Referencia anatómica del dolor (procedente del odontograma). */
    toothRef?: ToothRef;
  };
  /** Diagnósticos CIE-10 estructurados de la visita (Fase A). */
  diagnoses?: VisitDiagnosis[];
  /** Hallazgos del examen clínico de la visita (Fase A). */
  examFindings?: ExamFindings;
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface UpdateMedicalHistoryRequest {
  occupation?: string;
  maritalStatus?: string;
  systemicDiseases?: string[];
  currentMedications?: string[];
  allergies?: string[];
  previousSurgeries?: string[];
  chiefComplaint?: string;
  habits?: string[];
  currentPain?: CurrentPain;
  lastDentalVisit?: string;
}

export type ValidateMedicalHistoryRequest = Record<string, never>;

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const TREATMENT_STATUS_COLORS: Record<TreatmentStatus, string> = {
  pending: "gold",
  in_progress: "blue",
  completed: "green",
  cancelled: "default",
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: "red",
  warning: "orange",
  info: "blue",
};
