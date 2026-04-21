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
  top: ServiceDemandItem[];
  bottom: ServiceDemandItem[];
  appointmentsWithoutService: number;
}

export interface ServiceDemandItem {
  serviceId: string;
  serviceName: string;
  appointmentCount: number;
  estimatedRevenue: number;
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
