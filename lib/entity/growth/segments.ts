/**
 * Growth Patient Segment entities — B4 contracts.
 *
 * Backend V1: AND-only conditions.
 * Backend already enforces: active, OPTED_IN, phone not empty.
 * Do NOT duplicate those rules in frontend.
 *
 * IMPORTANT: operators match backend SegmentOperator enum EXACTLY:
 * EQ, NEQ, GT, GTE, LT, LTE, IN, NOT_IN, LIKE, IS_NULL, IS_NOT_NULL, BETWEEN
 *
 * Fields match backend SegmentField enum EXACTLY.
 * Backend ValueType: INTEGER, DECIMAL, STRING, BOOLEAN, UUID
 */

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

export type SegmentConditionField =
  | "lastVisitDaysAgo"
  | "futureAppointments"
  | "totalAppointments"
  | "totalCompletedAppointments"
  | "lastCancellationDaysAgo"
  | "hasEverVisited"
  | "totalServiceValue"
  | "doctorId"
  | "serviceId"
  | "appointmentType"
  | "daysSinceCreation"
  | "birthdayMonth"
  | "gender"
  | "age";

export interface SegmentCondition {
  field: string;
  operator: string;
  /** Scalar for EQ/GT/etc., array for IN/BETWEEN */
  value: string | number | boolean | (string | number)[];
}

/** Backend filterDefinition JSON structure (JSONB stored as string). */
export interface SegmentFilterDefinition {
  logic: "AND";
  conditions: SegmentCondition[];
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
}

export interface UpdatePatientSegmentRequest {
  name?: string;
  description?: string;
  filterDefinition?: string;
}

/**
 * Backend PatientSegmentEvaluator.SegmentEvaluationResult.
 */
export interface SegmentEvaluationResult {
  count: number;
  preview: SegmentPatientPreview[];
}

export interface SegmentPatientPreview {
  patientId: string;
  name: string;
  phone: string;
  lastVisitDate?: string;
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

/** Fields available for segment conditions, with allowed operators per backend SegmentField enum. */
export const SEGMENT_FIELD_OPTIONS: {
  value: SegmentConditionField;
  label: string;
  operators: SegmentConditionOperator[];
  valueType: "number" | "decimal" | "text" | "boolean" | "uuid";
}[] = [
  // ---- Calculated from appointments ----
  {
    value: "lastVisitDaysAgo",
    label: "Días desde última visita",
    operators: ["EQ", "GT", "GTE", "LT", "LTE"],
    valueType: "number",
  },
  {
    value: "futureAppointments",
    label: "Citas futuras",
    operators: ["EQ", "GT", "GTE", "LT", "LTE"],
    valueType: "number",
  },
  {
    value: "totalAppointments",
    label: "Total de citas",
    operators: ["EQ", "GT", "GTE", "LT", "LTE"],
    valueType: "number",
  },
  {
    value: "totalCompletedAppointments",
    label: "Citas completadas",
    operators: ["EQ", "GT", "GTE", "LT", "LTE"],
    valueType: "number",
  },
  {
    value: "lastCancellationDaysAgo",
    label: "Días desde última cancelación",
    operators: ["EQ", "GT", "GTE", "LT", "LTE", "IS_NULL"],
    valueType: "number",
  },
  {
    value: "hasEverVisited",
    label: "Ha visitado alguna vez",
    operators: ["EQ"],
    valueType: "boolean",
  },
  {
    value: "totalServiceValue",
    label: "Valor total de servicios",
    operators: ["EQ", "GT", "GTE", "LT", "LTE"],
    valueType: "decimal",
  },
  // ---- From appointments with FK ----
  {
    value: "doctorId",
    label: "Doctor",
    operators: ["EQ", "IN"],
    valueType: "uuid",
  },
  {
    value: "serviceId",
    label: "Servicio",
    operators: ["EQ", "IN"],
    valueType: "uuid",
  },
  {
    value: "appointmentType",
    label: "Tipo de cita",
    operators: ["EQ", "IN"],
    valueType: "text",
  },
  // ---- From patients directly ----
  {
    value: "daysSinceCreation",
    label: "Días desde registro",
    operators: ["EQ", "GT", "GTE", "LT", "LTE"],
    valueType: "number",
  },
  {
    value: "birthdayMonth",
    label: "Mes de cumpleaños",
    operators: ["EQ", "IN"],
    valueType: "number",
  },
  {
    value: "gender",
    label: "Género",
    operators: ["EQ", "IN"],
    valueType: "text",
  },
  {
    value: "age",
    label: "Edad",
    operators: ["EQ", "GT", "GTE", "LT", "LTE", "BETWEEN"],
    valueType: "number",
  },
];

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
