import type { NonCariousLesion } from "../types"

export class LesionService {
  static getIcon(lesion: NonCariousLesion): string {
    const icons: Record<NonCariousLesion, string> = {
      atricion: "⚡",
      abrasion: "🔨",
      erosion: "💧",
      hipoplasia: "⭕",
      fisura: "⚠️",
      fractura: "💥",
    }
    return icons[lesion] || "•"
  }

  static getColor(lesion: NonCariousLesion): string {
    const colors: Record<NonCariousLesion, string> = {
      atricion: "#F59E0B",
      abrasion: "#EF4444",
      erosion: "#3B82F6",
      hipoplasia: "#8B5CF6",
      fisura: "#EC4899",
      fractura: "#DC2626",
    }
    return colors[lesion] || "#6B7280"
  }

  static requiresTreatment(lesion: NonCariousLesion): boolean {
    return lesion === "fractura" || lesion === "erosion"
  }

  static getRecommendation(lesion: NonCariousLesion): string {
    const recommendations: Record<NonCariousLesion, string> = {
      atricion: "Evaluar oclusión y parafunción",
      abrasion: "Corregir técnica de cepillado",
      erosion: "Evaluar dieta ácida y reflujo",
      hipoplasia: "Evaluar necesidad estética",
      fisura: "Sellante preventivo",
      fractura: "Restauración inmediata",
    }
    return recommendations[lesion]
  }
}
