import type { ToothGlobalStatus, ToothCondition } from "../types/tooth.types"

export const GLOBAL_STATUS_LABELS: Record<ToothGlobalStatus, string> = {
  healthy: "Sano",
  absent: "Ausente",
  implant: "Implante",
  endodontic: "Endo",
  crown: "Corona",
}

export const GLOBAL_STATUS_COLORS: Record<ToothGlobalStatus, string> = {
  healthy: "#10B981",
  absent: "#6B7280",
  implant: "#8B5CF6",
  endodontic: "#EF4444",
  crown: "#F59E0B",
}

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  healthy: "#10B981",
  caries: "#DC2626",
  fracture: "#7C3AED",
  wear: "#F59E0B",
  stain: "#8B5CF6",
  calculus: "#78716C",
}

export const CONDITION_LABELS: Record<ToothCondition, string> = {
  healthy: "Sano",
  caries: "Caries",
  fracture: "Fractura",
  wear: "Desgaste",
  stain: "Tinción",
  calculus: "Cálculo",
}
