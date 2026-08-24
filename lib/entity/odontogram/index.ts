/**
 * Odontogram Entity Types
 *
 * Type definitions for odontogram and treatment-plan API endpoints.
 * Based on backend REST contract (see docs/ODONTOGRAM_API.md).
 */

// ─── Shared / Pagination ────────────────────────────────────────────

/** Reusable pagination shape returned by paginated endpoints. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/** Standard backend error shape. */
export interface ApiError {
  code: number;
  message: string;
  details?: string;
}

/** Query params accepted by paginated endpoints (history, treatment-plans). */
export interface PaginatedQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

// ─── Odontogram ─────────────────────────────────────────────────────

/**
 * PUT /odontograms — request body.
 * `state` is a **JSON string** containing `{ teeth, clinicalEvents }`.
 */
export interface SaveOdontogramRequest {
  patientId: string;
  visitId?: string | null;
  authorId: string;
  clinicId: string;
  version: number;
  state: string; // JSON.stringify({ teeth, clinicalEvents })
}

/**
 * GET /odontograms/patient/{patientId} — response body.
 * Returns `null` when the patient has no odontogram yet.
 */
export interface OdontogramResponse {
  id: string;
  patientId: string;
  version: number;
  state: string; // JSON string
  updatedAt: string; // ISO-8601
}

/**
 * Single entry returned by the history endpoint.
 * GET /odontograms/patient/{patientId}/history
 */
export interface OdontogramHistoryEntry {
  id: string;
  patientId: string;
  visitId?: string | null;
  authorId: string;
  clinicId: string;
  version: number;
  state: string; // JSON string
  createdAt: string; // ISO-8601
}

/** Paginated response for odontogram history. */
export interface PaginatedOdontogramHistoryResponse {
  entities: OdontogramHistoryEntry[];
  pagination: Pagination;
}

// ─── Treatment Plans ────────────────────────────────────────────────

/** Valid statuses for a treatment plan. */
export type PlanStatus = "active" | "completed" | "cancelled";

/**
 * POST /treatment-plans — request body.
 * `eventIds` is a **JSON string** containing an array of UUID strings.
 */
export interface CreateTreatmentPlanRequest {
  patientId: string;
  name: string;
  description?: string;
  totalPrice?: number;
  eventIds?: string; // JSON string: '["uuid-1","uuid-2"]'
}

/**
 * PUT /treatment-plans — request body.
 * `eventIds` is a **JSON string** containing an array of UUID strings.
 */
export interface UpdateTreatmentPlanRequest {
  id: string;
  name: string;
  description?: string;
  status?: PlanStatus;
  totalPrice?: number;
  eventIds?: string; // JSON string: '["uuid-1","uuid-2"]'
}

/**
 * Response shape for a single treatment plan.
 * GET /treatment-plans/{id}
 * Items inside GET /treatment-plans/patient/{patientId}
 */
export interface TreatmentPlanResponse {
  id: string;
  patientId: string;
  name: string;
  description?: string;
  status: PlanStatus;
  totalPrice?: number;
  eventIds: string; // JSON string array
  createdAt: string;
  updatedAt: string;
  active: boolean;
  /**
   * Referencia opcional al diagnóstico (CIE-10 dental) que originó el plan.
   * Forward-compatible: el backend puede no poblarla todavía; cuando está
   * presente, la historia clínica la muestra junto al plan.
   */
  linkedDiagnosis?: TreatmentPlanDiagnosisRef;
}

/** Referencia de diagnóstico vinculada a un plan de tratamiento. */
export interface TreatmentPlanDiagnosisRef {
  code: string;
  label: string;
  /** Diente FDI (11-48) asociado al diagnóstico, si aplica. */
  toothFdi?: string;
}

/** Paginated response for treatment plans. */
export interface PaginatedTreatmentPlansResponse {
  entities: TreatmentPlanResponse[];
  pagination: Pagination;
}

// ─── Treatment Plan Items (líneas del plan) ─────────────────────────

/**
 * Estado de una línea del plan.
 *
 * Es EXACTAMENTE el vocabulario de `ClinicalEventStatus` del modal del diente.
 * Una línea del plan y un procedimiento planificado sobre una pieza son la misma
 * cosa vista desde dos pantallas: dos listas de estados obligaban a traducir en
 * el medio y acababan divergiendo.
 *
 * Ojo: `canceled` con UNA ele, como el resto del odontograma.
 */
export type PlanItemStatus =
  | "open"
  | "plan"
  | "scheduled"
  | "in_progress"
  | "done"
  | "canceled"
  | "observation";

/** Prioridad clínica. Mismo vocabulario que `ProcedurePriority` del modal. */
export type PlanItemPriority = "alta" | "media" | "baja";

/**
 * Los estados en el ORDEN DEL CICLO DE VIDA de una línea, no en orden
 * alfabético ni de aparición en los datos: si se ordenaran por los datos, el
 * desplegable de estados se recolocaría solo en cada recarga y dos pacientes lo
 * enseñarían distinto.
 */
export const PLAN_ITEM_STATUSES: readonly PlanItemStatus[] = [
  "open",
  "plan",
  "scheduled",
  "in_progress",
  "done",
  "canceled",
  "observation",
];

/** Prioridades de mayor a menor urgencia. */
export const PLAN_ITEM_PRIORITIES: readonly PlanItemPriority[] = [
  "alta",
  "media",
  "baja",
];

/**
 * Una línea del plan de tratamiento.
 * GET /treatment-plans/{planId}/items → `items[]`
 *
 * Importes: `unitCost`, `currencyCode` y `lineTotal` los CONGELA/CALCULA el
 * servidor. El cliente nunca los manda ni los recalcula.
 */
export interface TreatmentPlanItem {
  id: string;
  planId: string;
  itemOrder: number;

  serviceId: string;
  serviceCode: string;
  serviceName: string;
  /** Precio unitario congelado del catálogo en el momento de presupuestar. */
  unitCost: number;
  /** Moneda congelada de la línea (ISO-4217). Mezclar monedas es un 400. */
  currencyCode: string;
  /**
   * Unidades. Cuando es > 1, `lineTotal` NO coincide con el precio de catálogo:
   * la fila TIENE que mostrarlo (p. ej. "×2" junto al nombre del servicio) o el
   * importe queda sin explicación en un documento que el paciente acepta.
   */
  quantity: number;
  /** Calculado en el servidor: cantidad × precio unitario. NO recalcular. */
  lineTotal: number;

  /** JSON string con array de FDI, p. ej. `"[16,17]"`. Vacío/`"[]"` = general. */
  toothNumbers?: string | null;
  /** JSON string con array de superficies. Nulo si no aplica. */
  surfaces?: string | null;
  /** Lo decide el servidor: `true` cuando la línea no cuelga de una pieza. */
  general: boolean;

  /** JSON string con array de ids de evento del odontograma. */
  odontogramEventIds?: string | null;
  /** Clave de idempotencia del puente odontograma → plan. */
  syncKey?: string | null;

  status: PlanItemStatus;
  priority: PlanItemPriority;
  phase?: number | null;
  /** Minutos estimados. Copiados del catálogo al añadir, editables después. */
  durationMinutes?: number | null;

  sessionsPlanned: number;
  sessionsDone: number;
  /** Derivado: hay sesiones registradas pero aún faltan. */
  inProgress: boolean;

  appointmentId?: string | null;
  performedVisitId?: string | null;
  /** ISO-8601. */
  performedAt?: string | null;
  performedBy?: string | null;
  notes?: string | null;
}

/**
 * GET /treatment-plans/{planId}/items — respuesta completa.
 * Los totales vienen YA CALCULADOS: sumarlos en el cliente haría que el
 * importe en pantalla pudiera diferir del presupuesto guardado.
 */
export interface TreatmentPlanItemsResponse {
  planId: string;
  items: TreatmentPlanItem[];
  /**
   * Suma de las líneas que cuentan para el presupuesto: todas menos las
   * canceladas. El predicado exacto está en {@link countsTowardsPlanTotal}.
   */
  total: number;
  /**
   * Moneda CONGELADA de los importes (la de la primera línea). `null` cuando el
   * plan aún no tiene líneas.
   *
   * Precedencia: esta moneda MANDA sobre la moneda actual de la clínica
   * (ADR-32) — un plan presupuestado en USD se pinta en USD aunque la clínica
   * haya cambiado de moneda después; lo contrario declararía un importe que el
   * paciente nunca aceptó. Solo cuando falta se cae a la de la clínica, NUNCA a
   * cadena vacía: `formatClinicCurrencyExact(x, "")` resuelve a USD en silencio
   * y estrenaría la pantalla de una clínica boliviana con un "$0,00".
   * `useTreatmentPlanItems` ya entrega esa resolución hecha en `currency`.
   */
  currencyCode?: string | null;
  /**
   * Nº TOTAL de líneas del plan, **incluidas las canceladas y las rechazadas**.
   * OJO: no comparte criterio con `total`, que las excluye. Nunca pegues este
   * contador y ese importe en la misma frase sin decir cuántas están anuladas
   * ("8 líneas · 4.300" con 2 rechazadas no le cuadra a nadie que sume las
   * filas). Para contar solo lo que suma, filtra con
   * {@link countsTowardsPlanTotal}.
   */
  totalCount: number;
  /** Cuántas de `totalCount` cuelgan de una pieza. Mismo criterio: incluye anuladas. */
  toothCount: number;
  /** Cuántas de `totalCount` son generales. Mismo criterio: incluye anuladas. */
  generalCount: number;
}

/**
 * ¿Esta línea suma en `total`? Espejo LITERAL de
 * `TreatmentPlanPricingService.countsTowardsTotal` del backend: cuenta todo
 * salvo lo cancelado.
 *
 * Para qué existe: el servidor manda `total` pero NO subtotales por grupo, y la
 * pantalla necesita "POR PIEZA — N líneas · importe" y "SERVICIOS GENERALES —
 * N líneas · importe". Esos subtotales son una PARTICIÓN de `total`, no un
 * cálculo nuevo: con este predicado se cumple la invariante
 * `subtotal(por pieza) + subtotal(generales) === total`. Las líneas canceladas se
 * siguen mostrando en su grupo —con el importe tachado y fuera de la suma—, ni
 * ocultas ni sumadas.
 */
export function countsTowardsPlanTotal(
  item: Pick<TreatmentPlanItem, "status">,
): boolean {
  return item.status !== "canceled";
}

/**
 * Una línea nueva dentro del body de POST /treatment-plans/{planId}/items.
 * Sin importes a propósito: los pone el servidor desde el catálogo.
 */
export interface AddPlanItemRequest {
  serviceId: string;
  /** JSON string con array de FDI, p. ej. `"[16,17]"`. Omitir = general. */
  toothNumbers?: string | null;
  /** JSON string con array de superficies. */
  surfaces?: string | null;
  /** Unidades; ausente = 1. */
  quantity?: number;
  /** Fase del plan; ausente = sin fase. */
  phase?: number;
  /** Sesiones previstas; ausente = 1. */
  sessionsPlanned?: number;
  /** JSON string con array de ids de evento del odontograma. */
  odontogramEventIds?: string | null;
  /** Clave de idempotencia: reenviar la misma no duplica la línea. */
  syncKey?: string | null;
  notes?: string | null;
}

/** Body completo de POST /treatment-plans/{planId}/items. */
export interface AddPlanItemsRequest {
  items: AddPlanItemRequest[];
}

/**
 * Body de PATCH /treatment-plans/items/{itemId}.
 *
 * Mismos campos que la ficha del modal del diente: estado, prioridad, tiempo,
 * costo y notas. No hay decisión del paciente ni descuento: la clínica no
 * gestiona eso.
 *
 * NULL-AWARE: manda SOLO lo que cambia. Un campo ausente no se toca; enviarlo
 * en vacío/0 SÍ lo sobrescribe. No se puede cambiar aquí el servicio, la moneda,
 * la pieza ni las superficies.
 */
export interface UpdatePlanItemRequest {
  status?: PlanItemStatus;
  priority?: PlanItemPriority;
  phase?: number;
  quantity?: number;
  /** Minutos estimados. */
  durationMinutes?: number;
  /** Precio unitario. Editable por línea, como en la ficha del modal. */
  unitCost?: number;
  notes?: string;
}

/**
 * Body (opcional) de PATCH /treatment-plans/items/{itemId}/session.
 * `visitId` puede omitirse: el odontograma se puede llenar fuera de consulta.
 */
export interface RegisterPlanItemSessionRequest {
  visitId?: string | null;
}

// ─── Service Templates / ICDAS Suggestions ──────────────────────────

/** A single service within a template, as returned by the suggest endpoint. */
export interface ServiceTemplateItemDetail {
  id: string;
  serviceId: string;
  itemOrder: number;
  dependsOnIds?: string;
}

/**
 * One suggestion returned by GET /service-templates/suggest.
 * Contains the template metadata plus the ordered list of service items.
 */
export interface IcdasTemplateSuggestion {
  templateId: string;
  templateCode: string;
  templateName: string;
  templateDescription?: string;
  priority: number;
  icdasFrom: number;
  icdasTo: number;
  items: ServiceTemplateItemDetail[];
}

/** Entry from GET /service-templates (paginated list). */
export interface ServiceTemplateResponse {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  active: boolean;
  createAt?: string;
}

/** Paginated response for service templates list. */
export interface PaginatedServiceTemplatesResponse {
  entities: ServiceTemplateResponse[];
  pagination: Pagination;
}

/** Enriched item returned by GET /service-templates/{id}. */
export interface ServiceTemplateItemEnriched {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCost?: number;
  serviceDuration?: number;
  itemOrder: number;
  dependsOnIds?: string;
}

// ─── Odontogram Visit Snapshot ─────────────────────────────────────────────

/**
 * Snapshot of an odontogram tied to a specific visit/appointment.
 * GET /odontograms/visit/{visitId}
 */
export interface OdontogramVisitSnapshot {
  id: string;
  patientId: string;
  visitId: string;
  state: string; // JSON string of the odontogram snapshot
  createdAt: string; // ISO-8601
  authorId?: string;
  /** Tipo de snapshot dentro de la visita: 'start' | 'final'. */
  snapshotType?: "start" | "final";
}

/**
 * Comparativo antes/después del odontograma de una visita.
 * GET /odontograms/visit/{visitId}/snapshots
 * Cualquiera de los dos puede ser `null` (consultas previas a la captura 'start',
 * o visitas sin odontograma guardado).
 */
export interface OdontogramVisitSnapshots {
  start: OdontogramVisitSnapshot | null;
  finalSnapshot: OdontogramVisitSnapshot | null;
}

/** Detailed response from GET /service-templates/{id}. */
export interface ServiceTemplateDetailResponse {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  active: boolean;
  createAt?: string;
  items: ServiceTemplateItemEnriched[];
}
