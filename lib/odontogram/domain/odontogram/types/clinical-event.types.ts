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
  /**
   * Color del SÍMBOLO (canal independiente del relleno de pieza). Lo usa el
   * render para pintar la cruz de ausencia (azul pendiente / rojo hecho), el
   * texto "ENDO" o el círculo de corona (neutro). Si no está definido, el
   * render cae al color neutro por defecto (#1F2937).
   */
  symbolColor?: string;
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
  /**
   * Importe en la moneda vigente de la clínica (`settings.currency`). NO hay
   * moneda por evento: el odontograma no almacena ni convierte divisas.
   */
  cost?: number;
  /** Service catalog reference for pricing and traceability */
  serviceId?: string;
  serviceCode?: string;
  serviceName?: string;
  /**
   * Cost snapshot from the service catalog at event creation time.
   * Misma moneda que `cost`: la vigente de la clínica.
   */
  serviceCost?: number;
  /** Per-service custom odontogram symbol (TEXT mode): short text drawn on the tooth */
  serviceSymbolText?: string;
  /** Per-service custom odontogram symbol (ASSET mode): image URL drawn on the tooth */
  serviceSymbolUrl?: string;
  createdAt: string;
  updatedAt: string;
  authorId?: string;
}
