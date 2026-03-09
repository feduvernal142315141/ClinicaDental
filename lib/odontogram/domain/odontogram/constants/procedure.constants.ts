import type { ProcedureCategory, ProcedurePriority } from "../types/procedure.types"
import type { ClinicalEventStatus } from "../types/clinical-event.types"

export const PROCEDURE_CATEGORIES: Record<ProcedureCategory, string> = {
  restaurador: "Restaurador",
  endodoncia: "Endodoncia",
  protesis: "Prótesis",
  implante: "Implante",
  preventivo: "Preventivo",
  periodoncia: "Periodoncia",
  estetico: "Estético",
  cirugia: "Cirugía",
}

export const PROCEDURE_CATEGORY_COLORS: Record<ProcedureCategory, string> = {
  restaurador: "#3B82F6",
  endodoncia: "#EF4444",
  protesis: "#F59E0B",
  implante: "#8B5CF6",
  preventivo: "#10B981",
  periodoncia: "#14B8A6",
  estetico: "#EC4899",
  cirugia: "#6B7280",
}

export const PLAN_STATUS_COLORS: Record<ClinicalEventStatus, string> = {
  open: "#94A3B8",
  plan: "#F59E0B",
  in_progress: "#8B5CF6",
  done: "#3B82F6",
  canceled: "#6B7280",
  observation: "#F97316",
}

export const PLAN_STATUS_LABELS: Record<ClinicalEventStatus, string> = {
  open: "Abierto",
  plan: "Planificado",
  in_progress: "En curso",
  done: "Realizado",
  canceled: "Cancelado",
  observation: "Observación",
}

export const PRIORITY_COLORS: Record<ProcedurePriority, string> = {
  alta: "#EF4444",
  media: "#F59E0B",
  baja: "#10B981",
}
