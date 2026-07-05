import type { ToothGlobalStatus, ToothCondition } from "../types/tooth.types"

export const GLOBAL_STATUS_LABELS: Record<ToothGlobalStatus, string> = {
  healthy: "Sano",
  extraction: "Extracción",
  absent_pending: "Ausente (pend.)",
  absent_done: "Ausente (hecha)",
  endodontic: "Endodoncia",
  crown_pending: "Corona (por hacer)",
  crown_done: "Corona (hecha)",
  implant: "Implante",
}

// Colores usados SOLO en chips/leyenda (no en el SVG del diente).
export const GLOBAL_STATUS_COLORS: Record<ToothGlobalStatus, string> = {
  healthy: "#10B981", // verde
  extraction: "#DC2626", // rojo (pieza rellena de rojo)
  absent_pending: "#2563EB", // azul (cruz pendiente)
  absent_done: "#DC2626", // rojo (cruz hecha)
  endodontic: "#1F2937", // neutro/ink (texto ENDO)
  crown_pending: "#D32F2F", // rojo (anillo por hacer)
  crown_done: "#2563EB", // azul (anillo realizada)
  implant: "#8B5CF6", // morado
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
