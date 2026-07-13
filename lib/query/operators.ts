/**
 * Operadores de filtro — Fuente única (front)
 *
 * Refleja EXACTO el enum backend `FilterOperator` (dominio de filtros del
 * mediator). Este es el único lugar del front donde debe vivir el
 * vocabulario de operadores; las copias históricas divergentes
 * (lib/entity/patients, lib/entity/roles) quedan redirigidas aquí por
 * re-export. `lib/models/filterOperator.ts` (el straggler camelCase de
 * convertToQueryString/useTable) se retiró en Fase 4 junto con su único
 * consumidor.
 */
export const FilterOperator = {
  EQ: "EQ",
  EQ_IGNORE_CASE: "EQ_IGNORE_CASE",
  NEQ: "NEQ",
  NEQ_IGNORE_CASE: "NEQ_IGNORE_CASE",
  GTE: "GTE",
  LTE: "LTE",
  GT: "GT",
  LT: "LT",
  CONTAINS: "CONTAINS",
  CONTAINS_IGNORE_CASE: "CONTAINS_IGNORE_CASE",
  NOT_CONTAINS: "NOT_CONTAINS",
  NOT_CONTAINS_IGNORE_CASE: "NOT_CONTAINS_IGNORE_CASE",
  RELATED_EQ: "RELATED_EQ",
  RELATED_CONTAINS: "RELATED_CONTAINS",
  IN: "IN",
  NOT_IN: "NOT_IN",
  RELATED_IN: "RELATED_IN",
} as const;

export type FilterOperatorName = (typeof FilterOperator)[keyof typeof FilterOperator];
