export const CLINIC_MODULES = {
  CORE_PATIENTS: "CORE_PATIENTS",
  CORE_APPOINTMENTS: "CORE_APPOINTMENTS",
  CORE_PROFESSIONALS: "CORE_PROFESSIONALS",
  CORE_SERVICES: "CORE_SERVICES",
  CORE_SETTINGS: "CORE_SETTINGS",
  CORE_DASHBOARD: "CORE_DASHBOARD",
  CORE_CLINICAL_HISTORY: "CORE_CLINICAL_HISTORY",
  COMMS_WHATSAPP: "COMMS_WHATSAPP",
  COMMS_REMINDERS: "COMMS_REMINDERS",
  AI_RECEPTIONIST: "AI_RECEPTIONIST",
  AI_AUTOMATION: "AI_AUTOMATION",
  MARKETING_CAMPAIGNS: "MARKETING_CAMPAIGNS",
  MARKETING_SEGMENTS: "MARKETING_SEGMENTS",
  GROWTH_ANALYTICS: "GROWTH_ANALYTICS",
  DENTAL_ODONTOGRAM: "DENTAL_ODONTOGRAM",
  DENTAL_TREATMENT_PLAN: "DENTAL_TREATMENT_PLAN",
  DENTAL_DICTATION: "DENTAL_DICTATION",
  DENTAL_ICDAS_TEMPLATES: "DENTAL_ICDAS_TEMPLATES",
  DOCUMENTATION: "DOCUMENTATION",
  FINANCE: "FINANCE",
  LEAD_CRM: "LEAD_CRM",
} as const;

export type ClinicModuleCode = (typeof CLINIC_MODULES)[keyof typeof CLINIC_MODULES];

export const CLINIC_MODULE_LABELS: Record<ClinicModuleCode, string> = {
  CORE_PATIENTS: "Pacientes",
  CORE_APPOINTMENTS: "Citas",
  CORE_PROFESSIONALS: "Profesionales",
  CORE_SERVICES: "Servicios",
  CORE_SETTINGS: "Configuración",
  CORE_DASHBOARD: "Panel principal",
  CORE_CLINICAL_HISTORY: "Historia clínica",
  COMMS_WHATSAPP: "WhatsApp",
  COMMS_REMINDERS: "Recordatorios",
  AI_RECEPTIONIST: "Recepcionista IA",
  AI_AUTOMATION: "IA Automation",
  MARKETING_CAMPAIGNS: "Campañas",
  MARKETING_SEGMENTS: "Segmentos",
  GROWTH_ANALYTICS: "Analítica de crecimiento",
  DENTAL_ODONTOGRAM: "Odontograma",
  DENTAL_TREATMENT_PLAN: "Planes de tratamiento",
  DENTAL_DICTATION: "Dictado dental",
  DENTAL_ICDAS_TEMPLATES: "Plantillas ICDAS",
  DOCUMENTATION: "Documentación",
  FINANCE: "Finanzas",
  LEAD_CRM: "Adquisición de pacientes",
};

export interface RouteModuleRequirement {
  allOf: readonly ClinicModuleCode[];
}

const ROUTE_REQUIREMENTS: ReadonlyArray<readonly [string, readonly ClinicModuleCode[]]> = [
  ["/growth/dashboard", [CLINIC_MODULES.GROWTH_ANALYTICS]],
  ["/growth/campaigns", [CLINIC_MODULES.MARKETING_CAMPAIGNS]],
  ["/growth/segments", [CLINIC_MODULES.MARKETING_SEGMENTS]],
  ["/settings/doctors", [CLINIC_MODULES.CORE_PROFESSIONALS]],
  ["/settings/services", [CLINIC_MODULES.CORE_SERVICES]],
  ["/settings/labels", [CLINIC_MODULES.CORE_APPOINTMENTS]],
  ["/settings", [CLINIC_MODULES.CORE_SETTINGS]],
  ["/documentation", [CLINIC_MODULES.DOCUMENTATION]],
  ["/my-appointments", [CLINIC_MODULES.CORE_APPOINTMENTS]],
  ["/appointments", [CLINIC_MODULES.CORE_APPOINTMENTS]],
  ["/patients", [CLINIC_MODULES.CORE_PATIENTS]],
  ["/history", [CLINIC_MODULES.CORE_CLINICAL_HISTORY]],
  ["/dashboard", [CLINIC_MODULES.CORE_DASHBOARD]],
  ["/campaigns", [CLINIC_MODULES.MARKETING_CAMPAIGNS]],
  ["/inbox", [CLINIC_MODULES.COMMS_WHATSAPP]],
  ["/billing", [CLINIC_MODULES.FINANCE]],
  ["/leads", [CLINIC_MODULES.LEAD_CRM]],
];

export function getRouteModuleRequirement(pathname: string): RouteModuleRequirement | null {
  if (/^\/patients\/[^/]+$/.test(pathname)) {
    return {
      allOf: [CLINIC_MODULES.CORE_PATIENTS, CLINIC_MODULES.CORE_CLINICAL_HISTORY],
    };
  }
  const match = ROUTE_REQUIREMENTS.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match ? { allOf: match[1] } : null;
}

export function missingModules(
  enabledModules: readonly string[],
  requirement: RouteModuleRequirement,
): ClinicModuleCode[] {
  const enabled = new Set(enabledModules);
  return requirement.allOf.filter((module) => !enabled.has(module));
}
