export type ToothSurface =
  | "mesial"
  | "distal"
  | "facial"
  | "lingual"
  | "oclusal";

export type LegacyToothSurface = ToothSurface;

export type SurfaceZoneCode =
  | ToothSurface
  | "incisal"
  | "cervical"
  | "radicular";

export interface SurfaceRef {
  code: SurfaceZoneCode;
  region?: "crown" | "root";
  legacyCode?: LegacyToothSurface;
  displayLabel?: string;
}

export type SurfaceStatus =
  | "healthy"
  | "pathology"
  | "planned"
  | "completed"
  | "preventive"
  | "absent";

export interface SurfaceState {
  surface: ToothSurface;
  status: SurfaceStatus;
  icdasScore?: ICDASScore;
  treatmentType?: string;
  color: string;
  lastUpdate: string;
  notes?: string;
}

export type ICDASScore = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CariesType = "coronal" | "radicular";
export type CariesActivity = "activa" | "inactiva" | "no-aplica";
export type NonCariousLesion =
  | "atricion"
  | "abrasion"
  | "erosion"
  | "hipoplasia"
  | "fisura"
  | "fractura";
export type DiagnosisVisualImpact = "surface" | "tooth" | "none";
export type DiagnosisFindingKind =
  | "caries"
  | "non-carious-lesion"
  | "support-only";

export interface SurfaceDiagnosis {
  surface: ToothSurface;
  surfaceRef?: SurfaceRef;
  icdasScore: ICDASScore;
  cariesType?: CariesType;
  cariesActivity?: CariesActivity;
  nonCariousLesions: NonCariousLesion[];
  findingKind?: DiagnosisFindingKind;
  visualImpact?: DiagnosisVisualImpact;
  notes?: string;
  lastUpdate: string;
}

export function isAnteriorToothNumber(toothNumber: number): boolean {
  const position = toothNumber % 10;
  return position >= 1 && position <= 3;
}

export function createSurfaceRef(
  toothNumber: number,
  surface: ToothSurface,
  cariesType?: CariesType,
): SurfaceRef {
  if (cariesType === "radicular") {
    return {
      code: "radicular",
      region: "root",
      legacyCode: surface,
      displayLabel: "Radicular",
    };
  }

  if (surface === "oclusal" && isAnteriorToothNumber(toothNumber)) {
    return {
      code: "incisal",
      region: "crown",
      legacyCode: surface,
      displayLabel: "Incisal",
    };
  }

  return {
    code: surface,
    region: "crown",
    legacyCode: surface,
  };
}
