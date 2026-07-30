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
