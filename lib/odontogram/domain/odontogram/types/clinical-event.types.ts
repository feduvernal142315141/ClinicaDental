import type { ToothSurface, ICDASScore } from "./surface.types"
import type { ProcedureCategory, ProcedurePriority } from "./procedure.types"

export type ClinicalEventType =
  | "diagnosis"
  | "plan"
  | "performed"
  | "perio"
  | "prosthesis"
  | "endo"
  | "implante"
  | "ausente"

export type ClinicalEventStatus = "open" | "plan" | "in_progress" | "done" | "canceled" | "observation"

export interface ClinicalEvent {
  id: string
  visitId?: string
  toothNumber: number
  surfaces: ToothSurface[]
  level?: "tooth" | "surface"
  type: ClinicalEventType
  status: ClinicalEventStatus
  severity?: ICDASScore
  icdasScore?: ICDASScore
  material?: string
  priority?: ProcedurePriority
  notes?: string
  attachments?: string[]
  procedureId?: string
  procedureName?: string
  category?: ProcedureCategory
  durationMin?: number
  cost?: number
  createdAt: string
  updatedAt: string
  authorId?: string
}
