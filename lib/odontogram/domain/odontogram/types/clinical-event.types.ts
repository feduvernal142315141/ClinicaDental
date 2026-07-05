import type {
  ToothSurface,
  ICDASScore,
  SurfaceDiagnosis,
  SurfaceRef,
} from "./surface.types";
import type { ProcedureCategory, ProcedurePriority } from "./procedure.types";
import type {
  EvidenceRef,
  PeriapicalStatus,
  PulpalStatus,
  ToothGlobalStatus,
  VitalityTest,
} from "./tooth.types";

export type ClinicalEventType =
  | "diagnosis"
  | "plan"
  | "performed"
  | "perio"
  | "prosthesis"
  | "endo"
  | "implante"
  | "ausente";

export type ClinicalEventStatus =
  | "open"
  | "plan"
  | "scheduled"
  | "in_progress"
  | "done"
  | "canceled"
  | "observation";

export type ClinicalEventDiagnosisKind =
  | "surface-finding"
  | "tooth-diagnostic"
  | "workflow-note";

export interface ClinicalEventDiagnosisPayload {
  surfaceDiagnosis?: Partial<SurfaceDiagnosis>;
  pulpalStatus?: PulpalStatus;
  periapicalStatus?: PeriapicalStatus;
  vitalityTests?: VitalityTest[];
  painScore?: number;
  painDescription?: string;
  generalNotes?: string;
  evidenceRefs?: EvidenceRef[];
}

export interface ClinicalEventVisualState {
  affectsOdontogram: boolean;
  colorKey?: string;
  symbolKey?: string;
  priorityKey?: string;
}

export interface ClinicalEventAutomationHints {
  suggestPlan?: boolean;
  autoCreatePlan?: boolean;
  updateGlobalStatusTo?: ToothGlobalStatus;
  urgencyLevel?: "none" | "low" | "medium" | "high" | "emergency";
}

export interface ClinicalEvent {
  id: string;
  schemaVersion?: number;
  visitId?: string;
  /** visitId = visita en curso; appointmentId/appointmentAt = cita futura agendada para el plan. */
  appointmentId?: string;
  appointmentAt?: string;
  toothNumber: number;
  surfaces: ToothSurface[];
  surfacesV2?: SurfaceRef[];
  level?: "tooth" | "surface";
  type: ClinicalEventType;
  status: ClinicalEventStatus;
  diagnosisKind?: ClinicalEventDiagnosisKind;
  diagnosisPayload?: ClinicalEventDiagnosisPayload;
  visualState?: ClinicalEventVisualState;
  automationHints?: ClinicalEventAutomationHints;
  severity?: ICDASScore;
  icdasScore?: ICDASScore;
  material?: string;
  priority?: ProcedurePriority;
  notes?: string;
  attachments?: string[];
  procedureId?: string;
  procedureName?: string;
  category?: ProcedureCategory;
  durationMin?: number;
  cost?: number;
  /** Service catalog reference for pricing and traceability */
  serviceId?: string;
  serviceCode?: string;
  serviceName?: string;
  /** Cost snapshot from the service catalog at event creation time */
  serviceCost?: number;
  /** Per-service custom odontogram symbol (TEXT mode): short text drawn on the tooth */
  serviceSymbolText?: string;
  /** Per-service custom odontogram symbol (ASSET mode): image URL drawn on the tooth */
  serviceSymbolUrl?: string;
  createdAt: string;
  updatedAt: string;
  authorId?: string;
}
