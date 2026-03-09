export type ToothSurface = "mesial" | "distal" | "facial" | "lingual" | "oclusal"

export type SurfaceStatus = "healthy" | "pathology" | "planned" | "completed" | "preventive" | "absent"

export interface SurfaceState {
  surface: ToothSurface
  status: SurfaceStatus
  icdasScore?: ICDASScore
  treatmentType?: string
  color: string
  lastUpdate: string
  notes?: string
}

export type ICDASScore = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type CariesType = "coronal" | "radicular"
export type CariesActivity = "activa" | "inactiva" | "no-aplica"
export type NonCariousLesion = "atricion" | "abrasion" | "erosion" | "hipoplasia" | "fisura" | "fractura"

export interface SurfaceDiagnosis {
  surface: ToothSurface
  icdasScore: ICDASScore
  cariesType?: CariesType
  cariesActivity?: CariesActivity
  nonCariousLesions: NonCariousLesion[]
  notes?: string
  lastUpdate: string
}
