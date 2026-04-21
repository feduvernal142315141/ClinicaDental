export interface DashboardSummary {
  period: DashboardPeriod;
  kpis: DashboardKpis;
  monthlyAppointments: MonthlyAppointments[];
  serviceDemand: ServiceDemand;
  doctorProductivity: DoctorProductivity[];
  patientSignals: PatientSignals;
}

export interface DashboardPeriod {
  from: string;
  to: string;
}

export interface DashboardKpis {
  todayTotal: number;
  todayScheduled: number;
  todayCompleted: number;
  todayCancelled: number;
  periodTotal: number;
  attendanceRate: number;
  cancellationRate: number;
  newPatients: number;
  activeDoctors: number;
  activeServices: number;
  estimatedProductionCompleted: number;
  estimatedPipelineScheduled: number;
  estimatedLossCancelled: number;
  averageTicket: number;
}

export interface MonthlyAppointments {
  month: string;
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface ServiceDemand {
  /** Consolidated top (citas + planes + realizados) */
  top: ServiceDemandItem[];
  /** Consolidated bottom */
  bottom: ServiceDemandItem[];
  /** Only from appointments */
  topByAppointments: ServiceDemandItem[];
  /** Only from odontogram plan events */
  topByPlans: ServiceDemandItem[];
  /** Only from odontogram performed events */
  topByPerformed: ServiceDemandItem[];
  appointmentsWithoutService: number;
  categoryDistribution: ServiceCategoryDistribution[];
  planConversion: PlanConversionItem[];
}

export interface ServiceDemandItem {
  serviceId: string;
  serviceName: string;
  appointmentCount: number;
  estimatedRevenue: number;
}

export interface ServiceCategoryDistribution {
  category: string;
  appointmentCount: number;
  planCount: number;
  performedCount: number;
  estimatedRevenue: number;
}

export interface PlanConversionItem {
  serviceId: string;
  serviceName: string;
  plannedCount: number;
  performedCount: number;
  conversionRate: number;
}

export interface DoctorProductivity {
  doctorId: string;
  doctorName: string;
  totalAppointments: number;
  completed: number;
  cancelled: number;
  attendanceRate: number;
  estimatedProduction: number;
}

export interface PatientSignals {
  uniquePatientsAttended: number;
  newPatients: number;
  recurringPatients: number;
}
