/**
 * Growth segment entities.
 *
 * A segment has one audience: patients (default) or prospects (leads, only with LEAD_CRM).
 * Backend V1: AND-only conditions, up to 20. Who can actually receive a campaign (consent,
 * verified phone, open lead...) is decided by the backend: never filter audiences here.
 *
 * The fields a segment can filter by come from `GET /patient-segments/fields?audience=`.
 * This file only holds what the backend does not send: Spanish labels and pure helpers.
 */

import {
  LEAD_STAGE_LABELS,
  LEAD_TEMPERATURE_LABELS,
  leadSourceLabel,
  type LeadStage,
  type LeadTemperature,
} from "@/lib/entity/leads";

export type SegmentAudience = "PATIENT" | "LEAD";

export const SEGMENT_AUDIENCES: SegmentAudience[] = ["PATIENT", "LEAD"];

export const SEGMENT_AUDIENCE_LABELS: Record<SegmentAudience, string> = {
  PATIENT: "Pacientes",
  LEAD: "Prospectos",
};

/** Audience of a segment or campaign; anything missing or unknown is a patient audience. */
export function segmentAudience(value: string | null | undefined): SegmentAudience {
  return value === "LEAD" ? "LEAD" : "PATIENT";
}

export type SegmentConditionOperator =
  | "EQ"
  | "NEQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN"
  | "NOT_IN"
  | "LIKE"
  | "IS_NULL"
  | "IS_NOT_NULL"
  | "BETWEEN";

export type SegmentValueType = "INTEGER" | "DECIMAL" | "STRING" | "BOOLEAN" | "UUID";

export type SegmentConditionValue = string | number | boolean | (string | number)[];

export interface SegmentCondition {
  field: string;
  operator: string;
  /** Scalar for EQ/GT/etc., array for IN/BETWEEN, absent for IS_NULL/IS_NOT_NULL. */
  value?: SegmentConditionValue;
}

/** Backend filterDefinition JSON structure (JSONB stored as string). */
export interface SegmentFilterDefinition {
  logic: "AND";
  conditions: SegmentCondition[];
}

/** One field of `GET /patient-segments/fields`. Empty `allowedValues` = any value of the type. */
export interface SegmentFieldDefinition {
  field: string;
  valueType: SegmentValueType | string;
  operators: string[];
  allowedValues: string[];
}

export interface SegmentFieldCatalog {
  audience: SegmentAudience | string;
  fields: SegmentFieldDefinition[];
}

/**
 * Backend response model: GetPatientSegmentResponseModel.
 * filterDefinition is a JSON STRING — must be parsed client-side.
 */
export interface PatientSegment {
  id: string;
  name: string;
  description?: string;
  segmentType: string;
  /** JSONB string — parse with JSON.parse() to get SegmentFilterDefinition */
  filterDefinition: string;
  cachedCount?: number;
  cachedCountAt?: string;
  active: boolean;
  /** Absent on a backend older than audiences: treat as PATIENT (`segmentAudience`). */
  audience?: SegmentAudience | string;
}

export interface PatientSegmentListResponse {
  entities: PatientSegment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Backend CreatePatientSegmentCommand.
 * filterDefinition must be a JSON STRING of SegmentFilterDefinition.
 */
export interface CreatePatientSegmentRequest {
  name: string;
  description?: string;
  filterDefinition: string;
  /** Chosen on creation and immutable afterwards. */
  audience?: SegmentAudience;
}

export interface UpdatePatientSegmentRequest {
  name?: string;
  description?: string;
  filterDefinition?: string;
}

/** One person of the preview: a patient segment fills `patientId`, a prospect segment `leadId`. */
export interface SegmentRecipientPreview {
  patientId: string | null;
  leadId?: string | null;
  /** A prospect may have no name: show the phone. */
  name: string | null;
  phone: string;
  lastVisitDate?: string | null;
}

/** Backend EvaluatePatientSegmentResponse. */
export interface SegmentEvaluationResult {
  audience?: SegmentAudience | string;
  /** People a campaign would reach (already excludes whoever cannot receive it). */
  count: number;
  preview: SegmentRecipientPreview[];
  /** Prospects without a name: a template that greets by name skips them. */
  excludedWithoutName?: number;
  /** The user may see how many prospects there are but not who they are. */
  recipientsHidden?: boolean;
}

export const SEGMENT_MAX_CONDITIONS = 20;
export const SEGMENT_MAX_LIST_VALUES = 50;

export const SEGMENT_RECIPIENTS_HIDDEN_MESSAGE = "No tienes permiso para ver quiénes son los prospectos";

export const SEGMENT_LEAD_ELIGIBILITY_HELP =
  "Solo cuentan los prospectos que pueden recibir una campaña: abiertos, con consentimiento de marketing y teléfono verificado. Los cerrados, convertidos o archivados no aparecen.";

export function excludedWithoutNameMessage(count: number): string {
  return count === 1
    ? "1 prospecto no tiene nombre; no recibirá una plantilla que salude por nombre."
    : `${count.toLocaleString("es")} prospectos no tienen nombre; no recibirán una plantilla que salude por nombre.`;
}

/** "12 prospectos" / "1 paciente". */
export function audienceCountLabel(audience: SegmentAudience, count: number): string {
  const noun = audience === "LEAD" ? (count === 1 ? "prospecto" : "prospectos") : count === 1 ? "paciente" : "pacientes";
  return `${count.toLocaleString("es")} ${noun}`;
}

/** Parse filterDefinition JSON string into typed object. */
export function parseFilterDefinition(raw: string | null | undefined): SegmentFilterDefinition {
  if (!raw) return { logic: "AND", conditions: [] };
  try {
    return JSON.parse(raw) as SegmentFilterDefinition;
  } catch {
    return { logic: "AND", conditions: [] };
  }
}

/** Serialize SegmentFilterDefinition to JSON string for backend. */
export function serializeFilterDefinition(def: SegmentFilterDefinition): string {
  return JSON.stringify(def);
}

/** Spanish labels of the fields the backend catalog may send. An unknown field shows its own name. */
export const SEGMENT_FIELD_LABELS: Record<string, string> = {
  // Patients
  lastVisitDaysAgo: "Días desde última visita",
  futureAppointments: "Citas futuras",
  totalAppointments: "Total de citas",
  totalCompletedAppointments: "Citas completadas",
  lastCancellationDaysAgo: "Días desde última cancelación",
  hasEverVisited: "Ha visitado alguna vez",
  totalServiceValue: "Valor total de servicios",
  doctorId: "Doctor",
  serviceId: "Servicio",
  appointmentType: "Tipo de cita",
  daysSinceCreation: "Días desde registro",
  birthdayMonth: "Mes de cumpleaños",
  gender: "Género",
  age: "Edad",
  // Prospects
  stage: "Etapa",
  temperature: "Temperatura",
  source: "Origen",
  sourceCampaign: "Campaña de origen",
  interestServiceId: "Servicio de interés",
  assignedToUserId: "Responsable",
  daysSinceLastActivity: "Días sin actividad",
  hasOverdueFollowUp: "Tiene seguimiento vencido",
};

export function segmentFieldLabel(field: string): string {
  return SEGMENT_FIELD_LABELS[field] ?? field;
}

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Label of one value of a field (stage, temperature, source, month). Falls back to the value. */
export function segmentValueLabel(field: string, value: string | number | boolean): string {
  const raw = String(value);
  switch (field) {
    case "stage":
      return LEAD_STAGE_LABELS[raw as LeadStage] ?? raw;
    case "temperature":
      return LEAD_TEMPERATURE_LABELS[raw as LeadTemperature] ?? raw;
    case "source":
      return leadSourceLabel(raw);
    case "birthdayMonth":
      return MONTH_LABELS[Number(raw) - 1] ?? raw;
    default:
      if (typeof value === "boolean") return value ? "Sí" : "No";
      return raw;
  }
}

/**
 * Closed list of values of a field: the catalog's `allowedValues`, or the months for the
 * birthday month. `null` = free value (or a lookup the screen resolves, like services).
 */
export function segmentFieldChoices(definition: SegmentFieldDefinition): string[] | null {
  if (definition.allowedValues?.length) return definition.allowedValues;
  if (definition.field === "birthdayMonth") return MONTH_LABELS.map((_, index) => String(index + 1));
  return null;
}

export const SEGMENT_OPERATOR_LABELS: Record<SegmentConditionOperator, string> = {
  EQ: "es igual a",
  NEQ: "no es igual a",
  GT: "mayor que",
  GTE: "mayor o igual a",
  LT: "menor que",
  LTE: "menor o igual a",
  IN: "está en",
  NOT_IN: "no está en",
  LIKE: "contiene",
  IS_NULL: "está vacío",
  IS_NOT_NULL: "no está vacío",
  BETWEEN: "entre",
};

/** `IS_NULL` on these fields has its own meaning for the clinic. */
const IS_NULL_LABELS: Record<string, string> = {
  temperature: "sin clasificar",
  assignedToUserId: "sin asignar",
};

export function segmentOperatorLabel(field: string, operator: string): string {
  if (operator === "IS_NULL" && IS_NULL_LABELS[field]) return IS_NULL_LABELS[field];
  return SEGMENT_OPERATOR_LABELS[operator as SegmentConditionOperator] ?? operator;
}

const OPERATOR_ORDER: string[] = [
  "EQ", "NEQ", "IN", "NOT_IN", "GT", "GTE", "LT", "LTE", "BETWEEN", "LIKE", "IS_NULL", "IS_NOT_NULL",
];

/** The catalog sends operators alphabetically; show them in a natural order. */
export function sortSegmentOperators(operators: string[]): string[] {
  const rank = (operator: string) => {
    const index = OPERATOR_ORDER.indexOf(operator);
    return index === -1 ? OPERATOR_ORDER.length : index;
  };
  return [...operators].sort((a, b) => rank(a) - rank(b));
}

export function isUnarySegmentOperator(operator: string): boolean {
  return operator === "IS_NULL" || operator === "IS_NOT_NULL";
}

export function isListSegmentOperator(operator: string): boolean {
  return operator === "IN" || operator === "NOT_IN";
}

export function findSegmentField(
  fields: SegmentFieldDefinition[] | undefined,
  field: string,
): SegmentFieldDefinition | undefined {
  return fields?.find((definition) => definition.field === field);
}

function isNumericType(valueType: string): boolean {
  return valueType === "INTEGER" || valueType === "DECIMAL";
}

function coerceScalar(valueType: string, value: unknown): string | number | boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (valueType === "BOOLEAN") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }
  if (isNumericType(valueType)) {
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    const text = String(value).trim();
    if (!text) return undefined;
    const parsed = Number(text);
    // Not a number: keep the text so validation can report it instead of sending 0.
    return Number.isFinite(parsed) ? parsed : text;
  }
  const text = String(value).trim();
  return text || undefined;
}

/**
 * Value with the type the backend expects for that field and operator. Types are strict there:
 * an integer sent as text ("7") or a boolean as text is rejected. Returns `undefined` when the
 * operator takes no value or nothing was entered.
 */
export function coerceSegmentValue(
  definition: Pick<SegmentFieldDefinition, "valueType">,
  operator: string,
  value: unknown,
): SegmentConditionValue | undefined {
  if (isUnarySegmentOperator(operator)) return undefined;
  if (isListSegmentOperator(operator) || operator === "BETWEEN") {
    const items = Array.isArray(value) ? value : value === undefined || value === null || value === "" ? [] : [value];
    const coerced = items
      .map((item) => coerceScalar(definition.valueType, item))
      .filter((item): item is string | number => item !== undefined && typeof item !== "boolean");
    return operator === "BETWEEN" ? coerced : Array.from(new Set(coerced));
  }
  return coerceScalar(definition.valueType, value);
}

function scalarError(definition: SegmentFieldDefinition, value: string | number | boolean): string | null {
  switch (definition.valueType) {
    case "INTEGER":
      return typeof value === "number" && Number.isInteger(value) && value >= 0
        ? null
        : "Escribe un número entero de 0 en adelante";
    case "DECIMAL":
      return typeof value === "number" && value >= 0 ? null : "Escribe un número de 0 en adelante";
    case "BOOLEAN":
      return typeof value === "boolean" ? null : "Elige Sí o No";
    default: {
      const choices = segmentFieldChoices(definition);
      return typeof value === "string" && (!choices || choices.includes(value)) ? null : "Elige un valor de la lista";
    }
  }
}

export interface SegmentConditionError {
  /** Where the message belongs in the form row. */
  target: "field" | "operator" | "value";
  message: string;
}

/**
 * Checks one condition against its catalog entry before sending it. `value` must already be
 * coerced (`coerceSegmentValue`). Returns `null` when the condition is valid.
 */
export function validateSegmentCondition(
  definition: SegmentFieldDefinition | undefined,
  condition: SegmentCondition,
): SegmentConditionError | null {
  if (!condition.field) return { target: "field", message: "El campo es obligatorio" };
  if (!definition) return { target: "field", message: "Este campo no está disponible para la audiencia del segmento" };
  if (!condition.operator) return { target: "operator", message: "El operador es obligatorio" };
  if (!definition.operators.includes(condition.operator)) {
    return { target: "operator", message: "Este operador no se puede usar con el campo" };
  }
  if (isUnarySegmentOperator(condition.operator)) return null;

  const { value } = condition;
  if (isListSegmentOperator(condition.operator)) {
    if (!Array.isArray(value) || value.length === 0) return { target: "value", message: "Elige al menos un valor" };
    if (value.length > SEGMENT_MAX_LIST_VALUES) {
      return { target: "value", message: `Elige como máximo ${SEGMENT_MAX_LIST_VALUES} valores` };
    }
    for (const item of value) {
      const message = scalarError(definition, item);
      if (message) return { target: "value", message };
    }
    return null;
  }
  if (condition.operator === "BETWEEN") {
    if (!Array.isArray(value) || value.length !== 2) return { target: "value", message: "Escribe los dos valores" };
    for (const item of value) {
      const message = scalarError(definition, item);
      if (message) return { target: "value", message };
    }
    return Number(value[0]) <= Number(value[1])
      ? null
      : { target: "value", message: "El primer valor no puede ser mayor que el segundo" };
  }
  if (value === undefined || Array.isArray(value)) return { target: "value", message: "El valor es obligatorio" };
  const message = scalarError(definition, value);
  return message ? { target: "value", message } : null;
}

export interface BuiltSegmentConditions {
  conditions: SegmentCondition[];
  /** One entry per invalid condition, by position in the form. */
  errors: { index: number; error: SegmentConditionError }[];
}

/** Typed conditions ready for `filterDefinition`, plus what is wrong with the ones that are not. */
export function buildSegmentConditions(
  conditions: SegmentCondition[],
  fields: SegmentFieldDefinition[],
): BuiltSegmentConditions {
  const built: SegmentCondition[] = [];
  const errors: BuiltSegmentConditions["errors"] = [];
  conditions.forEach((condition, index) => {
    const definition = findSegmentField(fields, condition.field);
    const value = definition ? coerceSegmentValue(definition, condition.operator, condition.value) : condition.value;
    const typed: SegmentCondition = { field: condition.field, operator: condition.operator };
    if (value !== undefined) typed.value = value;
    const error = validateSegmentCondition(definition, typed);
    if (error) errors.push({ index, error });
    built.push(typed);
  });
  return { conditions: built, errors };
}

/**
 * Sentence for a saved condition ("Etapa está en Nuevo, Contactado"). `resolve` turns ids of
 * services or users into names when the screen has them.
 */
export function formatSegmentCondition(
  condition: SegmentCondition,
  resolve?: (field: string, value: string) => string | undefined,
): string {
  const field = segmentFieldLabel(condition.field);
  const operator = segmentOperatorLabel(condition.field, condition.operator);
  if (isUnarySegmentOperator(condition.operator) || condition.value === undefined) return `${field} ${operator}`;
  const label = (value: string | number | boolean) =>
    resolve?.(condition.field, String(value)) ?? segmentValueLabel(condition.field, value);
  const values = Array.isArray(condition.value) ? condition.value.map(label) : [label(condition.value)];
  return `${field} ${operator} ${values.join(condition.operator === "BETWEEN" ? " y " : ", ")}`;
}
