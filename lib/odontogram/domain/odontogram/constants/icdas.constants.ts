import type { ICDASScore } from "../types/surface.types"

export const ICDAS_LABELS: Record<ICDASScore, string> = {
  0: "0 - Sano",
  1: "1 - Cambio visual",
  2: "2 - Cambio visual húmedo",
  3: "3 - Microcavitación",
  4: "4 - Sombra dentina",
  5: "5 - Cavitación",
  6: "6 - Cavitación extensa",
}

export const ICDAS_DESCRIPTIONS: Record<ICDASScore, string> = {
  0: "Sin evidencia de caries",
  1: "Primer cambio visual en esmalte",
  2: "Cambio visual distintivo en esmalte",
  3: "Ruptura localizada del esmalte",
  4: "Sombra oscura de dentina",
  5: "Cavitación distintiva con dentina visible",
  6: "Cavitación extensa con dentina visible",
}

export function getICDASColorIntensity(icdasScore: ICDASScore): string {
  const intensities: Record<ICDASScore, string> = {
    0: "#10B981",
    1: "#FCA5A5",
    2: "#F87171",
    3: "#EF4444",
    4: "#DC2626",
    5: "#B91C1C",
    6: "#991B1B",
  }
  return intensities[icdasScore]
}
