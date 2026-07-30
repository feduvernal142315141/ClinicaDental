import type { ProcedurePlan, ProcedureCategory } from "../types"

export interface PlanTotals {
  totalDuration: number
  totalCost: number
  byCategory: Record<ProcedureCategory, number>
  totalSessions: number
  averageCostPerSession: number
}

export class PlanCalculationService {
  static calculateTotals(plans: ProcedurePlan[]): PlanTotals {
    const totalDuration = plans.reduce((sum, p) => sum + p.durationMin, 0)
    const totalCost = plans.reduce((sum, p) => sum + p.cost, 0)
    
    const byCategory = plans.reduce(
      (acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + p.cost
        return acc
      },
      {} as Record<ProcedureCategory, number>
    )

    const sessions = new Set(plans.map((p) => p.sessionIndex || 1))
    const totalSessions = sessions.size

    const averageCostPerSession = totalSessions > 0 ? totalCost / totalSessions : 0

    return {
      totalDuration,
      totalCost,
      byCategory,
      totalSessions,
      averageCostPerSession,
    }
  }

  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }
}
