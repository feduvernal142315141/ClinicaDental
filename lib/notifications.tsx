export interface WhatsAppTemplate {
  id: string
  name: string
  content: string
  variables: string[]
}

export interface EmailConfig {
  provider: "smtp" | "sendgrid" | "resend"
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPassword?: string
  apiKey?: string
  fromEmail: string
  fromName: string
}

export interface ReminderConfig {
  enabled: boolean
  timing: "24h" | "2h"
  whatsappTemplate: string
  emailTemplate: string
}

export interface NotificationSettings {
  whatsappTemplates: WhatsAppTemplate[]
  emailConfig: EmailConfig
  reminders: {
    reminder24h: ReminderConfig
    reminder2h: ReminderConfig
  }
}

// Plantillas predeterminadas de WhatsApp
export const defaultWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: "confirmation",
    name: "Confirmación de Cita",
    content:
      "Hola {{paciente}}, tu cita con {{doctor}} ha sido confirmada para el {{fecha}} a las {{hora}}. Clínica {{clinica}}.",
    variables: ["paciente", "doctor", "fecha", "hora", "clinica"],
  },
  {
    id: "reminder",
    name: "Recordatorio de Cita",
    content:
      "Recordatorio: Tienes una cita mañana {{fecha}} a las {{hora}} con {{doctor}}. Clínica {{clinica}}. Si necesitas cancelar, llama al {{telefono}}.",
    variables: ["paciente", "doctor", "fecha", "hora", "clinica", "telefono"],
  },
  {
    id: "cancellation",
    name: "Cancelación de Cita",
    content:
      "Hola {{paciente}}, tu cita del {{fecha}} a las {{hora}} con {{doctor}} ha sido cancelada. Para reagendar, contacta a {{clinica}}.",
    variables: ["paciente", "doctor", "fecha", "hora", "clinica"],
  },
]

// Plantillas predeterminadas de Email
export const defaultEmailTemplates = {
  confirmation: {
    subject: "Confirmación de Cita - {{clinica}}",
    content: `
      <h2>Cita Confirmada</h2>
      <p>Estimado/a {{paciente}},</p>
      <p>Su cita ha sido confirmada con los siguientes detalles:</p>
      <ul>
        <li><strong>Doctor:</strong> {{doctor}}</li>
        <li><strong>Fecha:</strong> {{fecha}}</li>
        <li><strong>Hora:</strong> {{hora}}</li>
        <li><strong>Clínica:</strong> {{clinica}}</li>
      </ul>
      <p>Si necesita hacer algún cambio, por favor contacte con nosotros.</p>
    `,
  },
  reminder: {
    subject: "Recordatorio de Cita - {{clinica}}",
    content: `
      <h2>Recordatorio de Cita</h2>
      <p>Estimado/a {{paciente}},</p>
      <p>Le recordamos que tiene una cita programada:</p>
      <ul>
        <li><strong>Doctor:</strong> {{doctor}}</li>
        <li><strong>Fecha:</strong> {{fecha}}</li>
        <li><strong>Hora:</strong> {{hora}}</li>
        <li><strong>Clínica:</strong> {{clinica}}</li>
      </ul>
      <p>Si no puede asistir, por favor cancele con al menos 24 horas de anticipación.</p>
    `,
  },
}

export const getNotificationSettings = (): NotificationSettings => {
  if (typeof window === "undefined") {
    return getDefaultNotificationSettings()
  }

  const saved = localStorage.getItem("notificationSettings")
  return saved ? JSON.parse(saved) : getDefaultNotificationSettings()
}

export const saveNotificationSettings = (settings: NotificationSettings) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("notificationSettings", JSON.stringify(settings))
  }
}

const getDefaultNotificationSettings = (): NotificationSettings => ({
  whatsappTemplates: defaultWhatsAppTemplates,
  emailConfig: {
    provider: "smtp",
    fromEmail: "noreply@clinica.com",
    fromName: "Mi Clínica",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
  },
  reminders: {
    reminder24h: {
      enabled: true,
      timing: "24h",
      whatsappTemplate: "reminder",
      emailTemplate: "reminder",
    },
    reminder2h: {
      enabled: true,
      timing: "2h",
      whatsappTemplate: "reminder",
      emailTemplate: "reminder",
    },
  },
})
