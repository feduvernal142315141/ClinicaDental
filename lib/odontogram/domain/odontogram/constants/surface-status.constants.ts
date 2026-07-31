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
  /**
   * NO es un diagnóstico de sanidad. `healthy` es el estado por defecto de una
   * cara que se acaba de SELECCIONAR y sobre la que todavía no se ha dicho nada
   * (ver `surfaces-tab` al alternar una cara y la rehidratación de `tooth-modal`
   * cuando la cara no tiene ningún evento), y nunca genera evento al guardar.
   * Llamarlo "Sano" convertía "aún no lo he mirado" en una afirmación clínica, y
   * hacía convivir en el mismo diente un chip "O · Sano" con un "V · Plan".
   * El COLOR no se toca: es también el relleno de la cara seleccionada en el
   * selector, y cambiarlo alteraría el feedback de selección.
   */
  healthy: "Sin hallazgo",
  pathology: "Patología",
  planned: "Plan",
  completed: "Realizado/Existente",
  preventive: "Preventivo",
  absent: "Ausente/Implante",
}
