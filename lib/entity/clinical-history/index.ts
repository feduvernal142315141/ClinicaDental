/**
 * Clinical History Entity Types
 *
 * Type definitions for clinical history module (Phase 1)
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
