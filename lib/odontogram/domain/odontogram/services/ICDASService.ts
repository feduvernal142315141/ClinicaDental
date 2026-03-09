import type { ICDASScore } from "../types"
import { getICDASColorIntensity } from "../constants"

export class ICDASService {
  static getColor(score: ICDASScore): string {
    return getICDASColorIntensity(score)
  }

  static getSeverityLevel(score: ICDASScore): "healthy" | "low" | "medium" | "high" {
    if (score === 0) return "healthy"
    if (score <= 2) return "low"
    if (score <= 4) return "medium"
    return "high"
  }

  static requiresTreatment(score: ICDASScore): boolean {
    return score >= 3
  }

  static canBeReversed(score: ICDASScore): boolean {
    return score <= 2
  }

  static getRecommendation(score: ICDASScore): string {
    if (score === 0) return "Mantener higiene"
    if (score === 1) return "Prevención: Sellante o Flúor"
    if (score === 2) return "Prevención: Infiltración (ICON) o Flúor"
    if (score === 3) return "Restauración mínimamente invasiva"
    if (score === 4) return "Restauración conservadora"
    if (score === 5) return "Restauración"
    return "Restauración extensa o endodoncia"
  }
}
