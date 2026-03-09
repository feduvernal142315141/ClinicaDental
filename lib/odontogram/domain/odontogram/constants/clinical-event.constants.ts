import type { ClinicalEventStatus, ClinicalEventType } from "../types/clinical-event.types"

export const CLINICAL_EVENT_COLORS: Record<ClinicalEventStatus, string> = {
  open: "#DC2626",
  plan: "#F59E0B",
  in_progress: "#8B5CF6",
  done: "#3B82F6",
  canceled: "#6B7280",
  observation: "#F59E0B",
}

export const CLINICAL_EVENT_TYPE_COLORS: Record<ClinicalEventType, string> = {
  diagnosis: "#DC2626",
  plan: "#F59E0B",
  performed: "#3B82F6",
  perio: "#14B8A6",
  prosthesis: "#F59E0B",
  endo: "#8B5CF6",
  implante: "#6B7280",
  ausente: "#6B7280",
}
