import type { ClinicalEvent, ICDASScore } from "../types"
import { CLINICAL_EVENT_COLORS } from "../constants"
import { getICDASColorIntensity } from "../constants/icdas.constants"

export class ColorService {
  static getEventColor(event: ClinicalEvent): string {
    if (event.status === "done") return CLINICAL_EVENT_COLORS.done
    if (event.status === "plan") return CLINICAL_EVENT_COLORS.plan
    
    if (event.type === "diagnosis" && event.icdasScore && event.icdasScore > 0) {
      const intensity = Math.min(event.icdasScore / 6, 1)
      return `rgba(220, 38, 38, ${0.4 + intensity * 0.6})`
    }
    
    if (event.category === "preventivo") return "#10B981"
    
    return CLINICAL_EVENT_COLORS[event.status] || "#6B7280"
  }

  static getICDASColor(icdasScore: ICDASScore): string {
    return getICDASColorIntensity(icdasScore)
  }

  static getSurfaceColor(
    toothNumber: number,
    surface: string,
    events: ClinicalEvent[]
  ): string {
    const surfaceEvents = events.filter(
      (e) =>
        e.toothNumber === toothNumber &&
        (e.surfaces.includes(surface as unknown) || e.surfaces.length === 0)
    )

    const doneEvent = surfaceEvents.find(
      (e) => e.type === "performed" || e.status === "done"
    )
    if (doneEvent) return "#3B82F6"

    const planEvent = surfaceEvents.find(
      (e) => e.type === "plan" && e.status === "plan"
    )
    if (planEvent) return "#F59E0B"

    const diagnosisEvent = surfaceEvents.find(
      (e) => e.type === "diagnosis" && e.status === "open"
    )
    if (diagnosisEvent && diagnosisEvent.icdasScore && diagnosisEvent.icdasScore > 0) {
      return getICDASColorIntensity(diagnosisEvent.icdasScore)
    }

    const preventiveEvent = surfaceEvents.find((e) => e.category === "preventivo")
    if (preventiveEvent) return "#22C55E"

    return "#F5F5DC"
  }
}
