import type {
  ToothSurface,
  SurfaceDiagnosis,
  ICDASScore,
  SurfaceStatus,
} from "./surface.types";

export type ToothGlobalStatus =
  | "healthy"
  | "extraction"
  | "absent_pending"
  | "absent_done"
  | "endodontic"
  | "crown_pending"
  | "crown_done"
  | "implant";

export type ToothCondition =
  | "healthy"
  | "caries"
  | "fracture"
  | "wear"
  | "stain"
  | "calculus";

export type PulpalStatus =
  | "normal"
  | "reversible"
  | "irreversible"
  | "necrosis"
  | "observacion";
export type PeriapicalStatus =
  | "normal"
  | "periodontitis-apical"
  | "absceso"
  | "quiste";

export type VitalityTestType =
  | "frio"
  | "calor"
  | "ept"
  | "percusion" // conservado para compatibilidad con datos existentes
  | "percusion-horizontal"
  | "percusion-vertical"
  | "palpacion"
  | "dulce";
export type VitalityTestResult = "positivo" | "negativo" | "no-realizado";
export type EvidenceOwnerLevel = "surface" | "tooth" | "visit";

export interface VitalityTest {
  type: VitalityTestType;
  result: VitalityTestResult;
}

export interface EvidenceRef {
  id: string;
  ownerLevel: EvidenceOwnerLevel;
  ownerFindingId?: string;
  assetType: "foto" | "radiografia" | "otro";
  url?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface SurfaceCondition {
  id: string;
  surface: ToothSurface;
  condition: ToothCondition;
  severity: "mild" | "moderate" | "severe";
  notes?: string;
  diagnosedDate: string;
}

export interface SurfaceTreatment {
  id: string;
  surface: ToothSurface;
  type: string;
  category: string;
  description: string;
  price: number;
  status: "planned" | "completed";
  planName?: string;
  date: string;
  completedDate?: string;
  notes?: string;
}

export interface Treatment {
  id: string;
  type: string;
  description: string;
  status: "planned" | "completed";
  planName?: string;
  date: string;
  completedDate?: string;
  notes?: string;
  surfaces?: ToothSurface[];
  price?: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  description: string;
  performedBy?: string;
}

export interface ToothDiagnosis {
  toothNumber: number;
  surfaceDiagnoses: SurfaceDiagnosis[];
  pulpalStatus?: PulpalStatus;
  periapicalStatus?: PeriapicalStatus;
  vitalityTests: VitalityTest[];
  painScore?: number;
  painDescription?: string;
  generalNotes?: string;
  attachments?: string[];
  evidenceRefs?: EvidenceRef[];
  completionState?: "draft" | "complete";
  diagnosedDate: string;
  diagnosedBy?: string;
  updatedAt?: string;
}

export interface Tooth {
  number: number;
  globalStatus: ToothGlobalStatus;
  treatments: Treatment[];
  surfaceTreatments: SurfaceTreatment[];
  surfaceConditions: SurfaceCondition[];
  history: HistoryEntry[];
  diagnosis?: ToothDiagnosis;
}

export interface ToothTemplate {
  id: string;
  name: string;
  description: string;
  applicableSurfaces: ToothSurface[];
  status: SurfaceStatus;
  icdasScore?: ICDASScore;
  treatmentType?: string;
  color: string;
  category: "diagnostic" | "treatment" | "preventive";
}

export type PatientRiskLevel = "bajo" | "medio" | "alto";
