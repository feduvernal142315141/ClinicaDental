import type { Tooth, ClinicalEvent, TreatmentPlan, ProcedurePlan } from "../types"

export interface IOdontogramRepository {
  getAllTeeth(): Promise<Tooth[]>
  getToothById(toothNumber: number): Promise<Tooth | null>
  updateTooth(tooth: Tooth): Promise<void>
  
  getAllClinicalEvents(): Promise<ClinicalEvent[]>
  getClinicalEventsByTooth(toothNumber: number): Promise<ClinicalEvent[]>
  createClinicalEvent(event: Omit<ClinicalEvent, "id" | "createdAt" | "updatedAt">): Promise<ClinicalEvent>
  updateClinicalEvent(id: string, updates: Partial<ClinicalEvent>): Promise<void>
  deleteClinicalEvent(id: string): Promise<void>
  
  getAllTreatmentPlans(): Promise<TreatmentPlan[]>
  createTreatmentPlan(plan: Omit<TreatmentPlan, "id" | "createdDate">): Promise<TreatmentPlan>
  updateTreatmentPlan(id: string, updates: Partial<TreatmentPlan>): Promise<void>
  
  getAllProcedurePlans(): Promise<ProcedurePlan[]>
  createProcedurePlan(plan: Omit<ProcedurePlan, "id" | "createdAt" | "updatedAt">): Promise<ProcedurePlan>
  updateProcedurePlan(id: string, updates: Partial<ProcedurePlan>): Promise<void>
  deleteProcedurePlan(id: string): Promise<void>
  
  clearAll(): Promise<void>
}
