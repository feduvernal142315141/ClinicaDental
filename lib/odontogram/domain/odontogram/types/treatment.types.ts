import type { ToothSurface } from "./surface.types"

export interface TreatmentCategory {
  name: string
  treatments: TreatmentOption[]
}

export interface TreatmentOption {
  name: string
  price: number
  surfaces?: ToothSurface[]
  description?: string
}

export interface TreatmentPlan {
  id: string
  name: string
  description: string
  createdDate: string
  treatments: {
    toothNumber: number
    treatmentId: string
  }[]
  status: "active" | "completed" | "cancelled"
  totalPrice?: number
}
