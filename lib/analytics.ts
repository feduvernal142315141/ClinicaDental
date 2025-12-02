export interface DashboardStats {
  todayAppointments: {
    total: number
    completed: number
    cancelled: number
    pending: number
  }
  doctors: {
    active: number
    occupancy: { name: string; percentage: number }[]
  }
  patients: {
    thisMonth: number
    new: number
    recurring: number
  }
  revenue: {
    estimated: number
    previousMonth: number
    change: number
  }
  alerts: {
    pendingPayments: number
    missedFollowups: number
    frequentCancellations: number
  }
}

export interface ProductivityStats {
  attendanceRate: number
  averageWaitTime: number
  doctorRankings: { name: string; occupancy: number; appointments: number }[]
}

export interface PatientAnalytics {
  newVsRecurring: { new: number; recurring: number }
  demographics: {
    ageGroups: { range: string; count: number }[]
    gender: { male: number; female: number; other: number }
  }
  frequentCancellations: { name: string; cancellations: number }[]
  missedFollowups: { name: string; lastVisit: string }[]
}

export interface TreatmentAnalytics {
  commonProcedures: { name: string; count: number; revenue: number }[]
  treatmentProgress: { patientName: string; treatment: string; progress: number }[]
  pendingNotes: { doctor: string; patient: string; date: string }[]
}

export interface FinancialAnalytics {
  projectedVsReal: { month: string; projected: number; real: number }[]
  quotes: { pending: number; accepted: number; rejected: number }
  revenueByProcedure: { procedure: string; percentage: number; amount: number }[]
  pendingPayments: { patient: string; amount: number; dueDate: string }[]
}

export interface QualityIndicators {
  patientSatisfaction: number
  averageAppointmentTime: number
  abandonmentRate: number
  monthlyTrends: { month: string; satisfaction: number; abandonment: number }[]
}

// Mock data functions
export function getDashboardStats(): DashboardStats {
  return {
    todayAppointments: {
      total: 24,
      completed: 18,
      cancelled: 3,
      pending: 3,
    },
    doctors: {
      active: 8,
      occupancy: [
        { name: "Dr. García", percentage: 95 },
        { name: "Dr. López", percentage: 87 },
        { name: "Dr. Martínez", percentage: 82 },
        { name: "Dr. Rodríguez", percentage: 78 },
      ],
    },
    patients: {
      thisMonth: 156,
      new: 42,
      recurring: 114,
    },
    revenue: {
      estimated: 45000,
      previousMonth: 38000,
      change: 18.4,
    },
    alerts: {
      pendingPayments: 12,
      missedFollowups: 8,
      frequentCancellations: 5,
    },
  }
}

export function getProductivityStats(): ProductivityStats {
  return {
    attendanceRate: 87.5,
    averageWaitTime: 12,
    doctorRankings: [
      { name: "Dr. García", occupancy: 95, appointments: 28 },
      { name: "Dr. López", occupancy: 87, appointments: 24 },
      { name: "Dr. Martínez", occupancy: 82, appointments: 22 },
      { name: "Dr. Rodríguez", occupancy: 78, appointments: 20 },
    ],
  }
}

export function getPatientAnalytics(): PatientAnalytics {
  return {
    newVsRecurring: { new: 42, recurring: 114 },
    demographics: {
      ageGroups: [
        { range: "18-30", count: 45 },
        { range: "31-45", count: 62 },
        { range: "46-60", count: 38 },
        { range: "60+", count: 11 },
      ],
      gender: { male: 68, female: 82, other: 6 },
    },
    frequentCancellations: [
      { name: "Ana Pérez", cancellations: 4 },
      { name: "Luis Torres", cancellations: 3 },
      { name: "María Silva", cancellations: 3 },
    ],
    missedFollowups: [
      { name: "Carlos Mendoza", lastVisit: "2024-11-15" },
      { name: "Laura Jiménez", lastVisit: "2024-11-10" },
    ],
  }
}

export function getTreatmentAnalytics(): TreatmentAnalytics {
  return {
    commonProcedures: [
      { name: "Limpieza Dental", count: 45, revenue: 13500 },
      { name: "Ortodoncia", count: 12, revenue: 36000 },
      { name: "Implantes", count: 8, revenue: 24000 },
      { name: "Endodoncia", count: 15, revenue: 18000 },
    ],
    treatmentProgress: [
      { patientName: "Ana García", treatment: "Ortodoncia", progress: 65 },
      { patientName: "Luis Morales", treatment: "Implantes", progress: 40 },
      { patientName: "Carmen López", treatment: "Endodoncia", progress: 85 },
    ],
    pendingNotes: [
      { doctor: "Dr. García", patient: "Ana Pérez", date: "2024-12-15" },
      { doctor: "Dr. López", patient: "Carlos Silva", date: "2024-12-14" },
    ],
  }
}

export function getFinancialAnalytics(): FinancialAnalytics {
  return {
    projectedVsReal: [
      { month: "Jul", projected: 35000, real: 32000 },
      { month: "Ago", projected: 38000, real: 36000 },
      { month: "Sep", projected: 40000, real: 38000 },
      { month: "Oct", projected: 42000, real: 41000 },
      { month: "Nov", projected: 45000, real: 43000 },
      { month: "Dic", projected: 48000, real: 45000 },
    ],
    quotes: { pending: 15, accepted: 28, rejected: 7 },
    revenueByProcedure: [
      { procedure: "Ortodoncia", percentage: 40, amount: 36000 },
      { procedure: "Implantes", percentage: 27, amount: 24000 },
      { procedure: "Endodoncia", percentage: 20, amount: 18000 },
      { procedure: "Limpieza", percentage: 13, amount: 13500 },
    ],
    pendingPayments: [
      { patient: "Ana Pérez", amount: 2500, dueDate: "2024-12-20" },
      { patient: "Luis Torres", amount: 1800, dueDate: "2024-12-18" },
    ],
  }
}

export function getQualityIndicators(): QualityIndicators {
  return {
    patientSatisfaction: 4.6,
    averageAppointmentTime: 25,
    abandonmentRate: 12.5,
    monthlyTrends: [
      { month: "Jul", satisfaction: 4.2, abandonment: 15 },
      { month: "Ago", satisfaction: 4.3, abandonment: 14 },
      { month: "Sep", satisfaction: 4.4, abandonment: 13 },
      { month: "Oct", satisfaction: 4.5, abandonment: 13 },
      { month: "Nov", satisfaction: 4.6, abandonment: 12.5 },
      { month: "Dic", satisfaction: 4.6, abandonment: 12 },
    ],
  }
}
