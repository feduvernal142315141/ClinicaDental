import type { ToothSurface } from "./surface.types"
import type { ClinicalEventStatus } from "./clinical-event.types"

export type ProcedureCategory =
  | "restaurador"
  | "endodoncia"
  | "protesis"
  | "implante"
  | "preventivo"
  | "periodoncia"
  | "estetico"
  | "cirugia"

export type ProcedurePriority = "alta" | "media" | "baja"

export type Currency = "USD" | "NIO"

export interface ProcedureCatalogItem {
  id: string
  name: string
  category: ProcedureCategory
  aliases?: string[]
  code?: string
  description?: string
  compatibleSurfaces?: ToothSurface[]
  estimatedDuration: number
  baseCost: number
  materials?: string[]
  requiresAnesthesia?: boolean
  isFavorite?: boolean
  /** Símbolo personalizado del servicio para el odontograma (modo TEXT). */
  serviceSymbolText?: string
  /** Imagen personalizada del servicio para el odontograma (modo ASSET). */
  serviceSymbolUrl?: string
}

export interface ProcedureTemplate {
  id: string
  name: string
  description: string
  procedures: {
    procedureId: string
    order: number
    dependsOn?: string[]
  }[]
}

export interface ProcedurePlan {
  id: string
  toothNumber: number
  surfaces: ToothSurface[]
  procedureId: string
  displayName: string
  category: ProcedureCategory
  status: ClinicalEventStatus
  priority: ProcedurePriority
  material?: string
  durationMin: number
  cost: number
  sessionIndex?: number
  dependencies?: string[]
  dependencyRules?: string[]
  notes?: string
  suggestedByDiagnosisId?: string
  appointmentAt?: string
  blockedReason?: string
  isHomologousSuggestion?: boolean
  /** Símbolo personalizado del servicio para el odontograma (modo TEXT). */
  serviceSymbolText?: string
  /** Imagen personalizada del servicio para el odontograma (modo ASSET). */
  serviceSymbolUrl?: string
  createdAt: string
  updatedAt: string
  authorId?: string
}

export type PerformedStatus = "done" | "in_progress" | "partial" | "canceled"
export type PerformedOutcome = "ok" | "complication"

export interface MaterialUsed {
  brand: string
  shade?: string
  lot?: string
  expiration?: string
}

export interface ProtocolStep {
  id: string
  name: string
  completed: boolean
  notes?: string
}

export interface ProcedureProtocol {
  procedureId: string
  steps: ProtocolStep[]
}

export interface TimerData {
  startedAt?: string
  stoppedAt?: string
  totalMinutes: number
}

export interface PerformedProcedure {
  id: string
  visitId?: string
  toothNumber: number
  surfaces: ToothSurface[]
  level?: "tooth" | "surface"
  procedureId?: string
  adHocName?: string
  fromPlanId?: string
  status: PerformedStatus
  materials: MaterialUsed[]
  durationMin: number
  timer?: TimerData
  attachments: string[]
  notes?: string
  outcome: PerformedOutcome
  recommendation?: string
  operatorId?: string
  signedAt?: string
  protocol?: ProcedureProtocol
  createdAt: string
  updatedAt: string
}
