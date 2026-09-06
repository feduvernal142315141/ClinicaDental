export const PATIENT_TABS = {
  EVOLUTION: "evolucion",
  ODONTOGRAM: "odontograma",
  TREATMENT_PLAN: "plan-tratamiento",
  FILES: "imagenes",
} as const;
export type PatientTab = (typeof PATIENT_TABS)[keyof typeof PATIENT_TABS];
const MOUNTABLE: readonly string[] = Object.values(PATIENT_TABS);
const TAB_ALIASES: Record<string, PatientTab> = {
  workspace: PATIENT_TABS.EVOLUTION,
  "historia-clinica": PATIENT_TABS.EVOLUTION,
  evolucion: PATIENT_TABS.EVOLUTION,
  "evolucion-clinica": PATIENT_TABS.EVOLUTION,
  odontogram: PATIENT_TABS.ODONTOGRAM,
  odontograma: PATIENT_TABS.ODONTOGRAM,
  plan: PATIENT_TABS.TREATMENT_PLAN,
  "plan-tratamiento": PATIENT_TABS.TREATMENT_PLAN,
  "plan-de-tratamiento": PATIENT_TABS.TREATMENT_PLAN,
  "treatment-plan": PATIENT_TABS.TREATMENT_PLAN,
  imagenes: PATIENT_TABS.FILES,
  archivos: PATIENT_TABS.FILES,
  files: PATIENT_TABS.FILES,
  adjuntos: PATIENT_TABS.FILES,
};
export interface ResolveTabOptions {
  canViewTreatmentPlan: boolean;
}
export function resolveTab(
  raw: string | undefined,
  { canViewTreatmentPlan }: ResolveTabOptions,
): PatientTab {
  const candidate = raw ? (TAB_ALIASES[raw] ?? raw) : PATIENT_TABS.EVOLUTION;
  if (!MOUNTABLE.includes(candidate)) return PATIENT_TABS.EVOLUTION;
  if (candidate === PATIENT_TABS.TREATMENT_PLAN && !canViewTreatmentPlan) {
    return PATIENT_TABS.EVOLUTION;
  }
  return candidate as PatientTab;
}
