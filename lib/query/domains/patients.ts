/**
 * Query de pacientes — único lugar del front donde viven los nombres de
 * columna de pacientes, más azúcar semántico. Dialecto standard
 * (3 segmentos: `field__OP__value`).
 */
import { QueryBuilder, standardDialect } from "../builder";
import type { FilterOperatorName } from "../operators";
import { cond, orderBy } from "../search";
import type { SearchCondition, SearchOrder, SearchValueType } from "../search";

export type PatientField =
  | "name"
  | "createAt"
  | "active"
  | "documentNumber"
  | "phone"
  | "email";

/**
 * Subconjunto de {@link PatientField} realmente aceptado por el registry backend en
 * `/patients/search` (Fase 3). Restringir el DSL a estos evita construir en el front una
 * condición tipada que el backend rechazaría con 400 (footgun de coherencia).
 */
export type PatientSearchField = "name" | "email" | "active" | "createAt";
/** Campos ordenables en `/patients/search` (email no es sortable en el registry). */
export type PatientSortField = "name" | "active" | "createAt";

export class PatientsQuery extends QueryBuilder<PatientField> {
  constructor() {
    super(standardDialect);
  }

  /** Busca por nombre (case-insensitive). Ignora términos vacíos. */
  search(q: string): this {
    const term = q.trim();
    if (term) this.where("name", "CONTAINS_IGNORE_CASE", term);
    return this;
  }

  active(v: boolean): this {
    return this.where("active", "EQ", v);
  }

  orderByName(dir: "asc" | "desc" = "asc"): this {
    return this.order("name", dir);
  }
}

export const patientsQuery = () => new PatientsQuery();

/**
 * Condición hoja del árbol de búsqueda (Fase 3, POST /patients/search) tipada al dominio de
 * pacientes: `field` restringido a {@link PatientField}. El backend valida además contra su
 * registry (solo name/email/active/createAt están activos hoy).
 *
 * Ejemplo `(name~jose OR email~jose) AND active`:
 *   and(or(patientCond("name","CONTAINS_IGNORE_CASE","jose"),
 *          patientCond("email","CONTAINS_IGNORE_CASE","jose")),
 *       patientCond("active","EQ",true,"BOOLEAN"))
 */
export const patientCond = (
  field: PatientSearchField,
  operator: FilterOperatorName,
  value: unknown,
  valueType?: SearchValueType,
): SearchCondition => cond<PatientSearchField>(field, operator, value, valueType);

/** Orden por nombre lógico de campo de paciente (ASC por defecto). */
export const patientOrder = (
  field: PatientSortField,
  dir: "ASC" | "DESC" = "ASC",
): SearchOrder => orderBy(field, dir);
