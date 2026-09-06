/**
 * Pestañas de la ficha del paciente.
 *
 * Las CUATRO son fijas. Antes `workspace` y `odontograma` eran mutuamente
 * excluyentes (`{isCurrentlyActiveConsultation && <TabsContent value="workspace">}`
 * frente a `{!isCurrentlyActiveConsultation && <TabsContent value="odontograma">}`),
 * y eso tenía dos consecuencias malas:
 *
 * 1. Un `?tab=workspace` sin consulta activa —un enlace viejo compartido tras
 *    finalizar— dejaba a Radix con un `value` sin `TabsContent` ni `TabsTrigger`:
 *    franja de pestañas y debajo el vacío.
 * 2. Peor: un booleano decidía qué se MONTA, así que cualquier transición
 *    transitoria desmontaba y remontaba el odontograma, con refetch completo y
 *    pérdida del autoguardado con debounce de 300 ms.
 *
 * Con las pestañas fijas ese booleano deja de gobernar el árbol de montaje y
 * pasa a ser cosmético.
 */
export const PATIENT_TABS = {
  EVOLUTION: "evolucion",
  ODONTOGRAM: "odontograma",
  TREATMENT_PLAN: "plan-tratamiento",
  FILES: "imagenes",
} as const;

export type PatientTab = (typeof PATIENT_TABS)[keyof typeof PATIENT_TABS];

const MOUNTABLE: readonly string[] = Object.values(PATIENT_TABS);

/**
 * Alias aceptados en `?tab=`. Existen porque hay enlaces ya repartidos —desde la
 * agenda, el detalle de cita, correos— que no se pueden reescribir.
 *
 * `workspace` e `historia-clinica` apuntan ambos a Evolución: el Workspace dejó
 * de ser una pestaña propia, pero sus enlaces siguen vivos y son el ÚNICO camino
 * desde la agenda para atender una consulta.
 */
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

/**
 * Resuelve el valor de pestaña a uno que SIEMPRE está montado.
 *
 * Es una función TOTAL a propósito: cualquier entrada —un alias, un valor
 * desconocido, `undefined`, o el plan de tratamiento sin permiso— devuelve una
 * pestaña que existe. La degradación se hace al LEER y no con estado nuevo, para
 * no encadenar un render extra en cada carga.
 *
 * Se usa tanto en el `value` del `<Tabs>` como al escribir en la URL: normalizar
 * solo el render dejaría el estado interno apuntando a un valor fantasma.
 */
export function resolveTab(
  raw: string | undefined,
  { canViewTreatmentPlan }: ResolveTabOptions,
): PatientTab {
  const candidate = raw ? (TAB_ALIASES[raw] ?? raw) : PATIENT_TABS.EVOLUTION;

  if (!MOUNTABLE.includes(candidate)) return PATIENT_TABS.EVOLUTION;

  // El plan lo protege el backend con `hasAuthority('odontogram')`. Sin el
  // módulo, tanto el listado como el get-or-create responden 403, así que la
  // pestaña no se monta y un enlace directo cae en Evolución en vez de enseñar
  // un error que el usuario no puede resolver.
  if (candidate === PATIENT_TABS.TREATMENT_PLAN && !canViewTreatmentPlan) {
    return PATIENT_TABS.EVOLUTION;
  }

  return candidate as PatientTab;
}
