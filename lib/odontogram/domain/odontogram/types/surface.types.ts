export type ToothSurface =
  | "mesial"
  | "distal"
  | "facial"
  | "lingual"
  | "oclusal"
  // Tercio cervical (G.V. Black Clase V). INDEPENDIENTE por cara: la cervical
  // vestibular (bucal) y la cervical lingual/palatina son lesiones distintas
  // (Clase V bucal vs Clase V palatina) — marcar una NO marca la otra. Cada una
  // solo existe/se marca en su propia vista; nunca en la oclusal/incisal.
  | "cervicalVestibular"
  | "cervicalLingual";

export type LegacyToothSurface = ToothSurface;

export type SurfaceZoneCode =
  | ToothSurface
  | "incisal"
  | "palatino"
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

/** Maxilar = cuadrantes 1 y 2 (FDI/ISO 3950). */
export function isMaxillaryToothNumber(toothNumber: number): boolean {
  const quadrant = Math.floor(toothNumber / 10);
  return quadrant === 1 || quadrant === 2;
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

  if (surface === "cervicalVestibular" || surface === "cervicalLingual") {
    return {
      code: "cervical",
      region: "crown",
      legacyCode: surface,
      displayLabel: "Cervical",
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

  // Cara lingual en dientes maxilares = Palatino (FDI). Conserva legacyCode
  // 'lingual' para compatibilidad con datos/render existentes.
  if (surface === "lingual" && isMaxillaryToothNumber(toothNumber)) {
    return {
      code: "palatino",
      region: "crown",
      legacyCode: surface,
      displayLabel: "Palatino",
    };
  }

  return {
    code: surface,
    region: "crown",
    legacyCode: surface,
  };
}
