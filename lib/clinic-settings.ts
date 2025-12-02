export interface ClinicSettings {
  // Datos de la clínica
  name: string
  logo?: string
  address: string
  phone: string
  email: string
  website?: string

  // Horarios de atención
  businessHours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }

  // Configuración regional
  currency: string
  timezone: string

  // Políticas de citas
  appointmentPolicies: {
    minimumAdvanceTime: number // en horas
    cancellationLimit: number // por mes
    standardDuration: number // en minutos
    allowOnlineBooking: boolean
    requireConfirmation: boolean
    sendReminders: boolean
    reminderTime: number // horas antes de la cita
  }
}

// Configuración por defecto
export const defaultSettings: ClinicSettings = {
  name: "Clínica Dental San José",
  address: "Av. Principal 123, Ciudad",
  phone: "+1 (555) 123-4567",
  email: "info@clinicasanjose.com",
  website: "www.clinicasanjose.com",

  businessHours: {
    monday: { open: "08:00", close: "18:00", closed: false },
    tuesday: { open: "08:00", close: "18:00", closed: false },
    wednesday: { open: "08:00", close: "18:00", closed: false },
    thursday: { open: "08:00", close: "18:00", closed: false },
    friday: { open: "08:00", close: "17:00", closed: false },
    saturday: { open: "09:00", close: "14:00", closed: false },
    sunday: { open: "09:00", close: "12:00", closed: true },
  },

  currency: "USD",
  timezone: "America/New_York",

  appointmentPolicies: {
    minimumAdvanceTime: 2, // 2 horas
    cancellationLimit: 3, // 3 cancelaciones por mes
    standardDuration: 30, // 30 minutos
    allowOnlineBooking: true,
    requireConfirmation: true,
    sendReminders: true,
    reminderTime: 24, // 24 horas antes
  },
}

// Simulación de API
export const getClinicSettings = async (): Promise<ClinicSettings> => {
  // Simular delay de API
  await new Promise((resolve) => setTimeout(resolve, 500))

  // En una app real, esto vendría de la base de datos
  const saved = localStorage.getItem("clinic-settings")
  return saved ? JSON.parse(saved) : defaultSettings
}

export const updateClinicSettings = async (settings: ClinicSettings): Promise<void> => {
  // Simular delay de API
  await new Promise((resolve) => setTimeout(resolve, 500))

  // En una app real, esto se guardaría en la base de datos
  localStorage.setItem("clinic-settings", JSON.stringify(settings))
}
