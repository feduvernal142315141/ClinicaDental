import type { SurfaceStatus } from "../types/surface.types"

export const SURFACE_STATUS_COLORS: Record<SurfaceStatus, string> = {
  healthy: "#10B981",
  pathology: "#DC2626",
  planned: "#F59E0B",
  completed: "#3B82F6",
  preventive: "#10B981",
  absent: "#6B7280",
}

export const SURFACE_STATUS_LABELS: Record<SurfaceStatus, string> = {
  healthy: "Sano",
  pathology: "Patología",
  planned: "Plan",
  completed: "Realizado/Existente",
  preventive: "Preventivo",
  absent: "Ausente/Implante",
}
