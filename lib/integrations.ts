export interface Integration {
  id: string
  name: string
  description: string
  category: "payment" | "storage" | "communication" | "calendar" | "analytics"
  icon: string
  enabled: boolean
  configured: boolean
  config?: Record<string, unknown>
}

export interface IntegrationSettings {
  // Pagos
  stripe: {
    enabled: boolean
    publicKey: string
    secretKey: string
    webhookSecret: string
    currency: string
  }
  paypal: {
    enabled: boolean
    clientId: string
    clientSecret: string
    environment: "sandbox" | "production"
  }

  // Almacenamiento
  cloudStorage: {
    provider: "aws" | "google" | "azure" | "none"
    enabled: boolean
    config: {
      accessKey?: string
      secretKey?: string
      bucket?: string
      region?: string
    }
  }

  // Comunicación
  zoom: {
    enabled: boolean
    apiKey: string
    apiSecret: string
    webhookSecret: string
  }
  googleMeet: {
    enabled: boolean
    clientId: string
    clientSecret: string
  }

  // Calendario
  googleCalendar: {
    enabled: boolean
    clientId: string
    clientSecret: string
    calendarId: string
    syncEnabled: boolean
  }

  // Analytics
  googleAnalytics: {
    enabled: boolean
    trackingId: string
    measurementId: string
  }

  // Backup
  backup: {
    enabled: boolean
    frequency: "daily" | "weekly" | "monthly"
    retention: number
    destination: "local" | "cloud"
  }
}

const defaultIntegrationSettings: IntegrationSettings = {
  stripe: {
    enabled: false,
    publicKey: "",
    secretKey: "",
    webhookSecret: "",
    currency: "USD",
  },
  paypal: {
    enabled: false,
    clientId: "",
    clientSecret: "",
    environment: "sandbox",
  },
  cloudStorage: {
    provider: "none",
    enabled: false,
    config: {},
  },
  zoom: {
    enabled: false,
    apiKey: "",
    apiSecret: "",
    webhookSecret: "",
  },
  googleMeet: {
    enabled: false,
    clientId: "",
    clientSecret: "",
  },
  googleCalendar: {
    enabled: false,
    clientId: "",
    clientSecret: "",
    calendarId: "",
    syncEnabled: false,
  },
  googleAnalytics: {
    enabled: false,
    trackingId: "",
    measurementId: "",
  },
  backup: {
    enabled: true,
    frequency: "daily",
    retention: 30,
    destination: "local",
  },
}

export const integrationsList: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Procesamiento de pagos seguro y confiable",
    category: "payment",
    icon: "💳",
    enabled: false,
    configured: false,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Pagos en línea con PayPal",
    category: "payment",
    icon: "🅿️",
    enabled: false,
    configured: false,
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Videollamadas para teleconsultas",
    category: "communication",
    icon: "📹",
    enabled: false,
    configured: false,
  },
  {
    id: "google-meet",
    name: "Google Meet",
    description: "Reuniones virtuales con Google Meet",
    category: "communication",
    icon: "🎥",
    enabled: false,
    configured: false,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincronización con Google Calendar",
    category: "calendar",
    icon: "📅",
    enabled: false,
    configured: false,
  },
  {
    id: "cloud-storage",
    name: "Almacenamiento en la Nube",
    description: "Backup automático de archivos médicos",
    category: "storage",
    icon: "☁️",
    enabled: false,
    configured: false,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Análisis de uso y estadísticas",
    category: "analytics",
    icon: "📊",
    enabled: false,
    configured: false,
  },
]

export function getIntegrationSettings(): IntegrationSettings {
  if (typeof window === "undefined") return defaultIntegrationSettings

  const saved = localStorage.getItem("integrationSettings")
  return saved ? { ...defaultIntegrationSettings, ...JSON.parse(saved) } : defaultIntegrationSettings
}

export function saveIntegrationSettings(settings: Partial<IntegrationSettings>) {
  if (typeof window === "undefined") return

  const current = getIntegrationSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem("integrationSettings", JSON.stringify(updated))
}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
export function testIntegration(integrationId: string): Promise<boolean> {
  // Simular prueba de conexión
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() > 0.3) // 70% de éxito
    }, 2000)
  })
}
