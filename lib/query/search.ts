/**
 * DSL de búsqueda por ÁRBOL booleano (Fase 3, POST /resource/search)
 *
 * Produce un árbol de OBJETOS puros (CERO strings de filtro, CERO separadores). El front
 * referencia SOLO nombres LÓGICOS de campo; el backend resuelve columna/operador/tipo contra su
 * registry por-dominio (whitelist) y compone con PRECEDENCIA REAL.
 *
 * `(A OR B) AND C` se escribe:
 *   and(or(cond("name","CONTAINS_IGNORE_CASE","jose"),
 *          cond("email","CONTAINS_IGNORE_CASE","jose")),
 *       cond("active","EQ",true,"BOOLEAN"))
 *
 * La forma emitida coincide con la deserialización Jackson DEDUCTION del backend:
 *   - nodo con { op, nodes }              → SearchGroup
 *   - nodo con { field, operator, value } → SearchCondition
 */
import type { FilterOperatorName } from "./operators";

/** Operador de composición de un grupo. */
export type SearchConcat = "AND" | "OR";

/** Tipo lógico declarado del valor (espeja SearchableField.FieldType del backend). */
export type SearchValueType = "STRING" | "BOOLEAN" | "DATE" | "UUID" | "NUMBER";

/** Condición HOJA: predicado atómico sobre un campo lógico. */
export interface SearchCondition {
  field: string;
  operator: FilterOperatorName;
  value: unknown;
  valueType?: SearchValueType;
}

/** Grupo booleano: combina sus `nodes` con `op` (AND/OR). Puede anidarse. */
export interface SearchGroup {
  op: SearchConcat;
  nodes: SearchNode[];
}

/** Un nodo del árbol es un grupo o una condición. */
export type SearchNode = SearchGroup | SearchCondition;

/** Cláusula de orden por nombre lógico de campo. */
export interface SearchOrder {
  field: string;
  dir: "ASC" | "DESC";
}

/** Cuerpo del POST /resource/search. */
export interface SearchRequest {
  filter: SearchGroup;
  orders?: SearchOrder[];
  page?: number;
  pageSize?: number;
  showTotalCount?: boolean;
}

/** Grupo AND de los nodos dados. */
export const and = (...nodes: SearchNode[]): SearchGroup => ({ op: "AND", nodes });

/** Grupo OR de los nodos dados. */
export const or = (...nodes: SearchNode[]): SearchGroup => ({ op: "OR", nodes });

/**
 * Condición hoja. `field` es un nombre LÓGICO (parametrizable por dominio vía el genérico `F`).
 * `valueType` es opcional; si se pasa, el backend hace cross-check con el tipo del registry.
 */
export const cond = <F extends string = string>(
  field: F,
  operator: FilterOperatorName,
  value: unknown,
  valueType?: SearchValueType,
): SearchCondition => ({ field, operator, value, valueType });

/** Cláusula de orden (ASC por defecto). */
export const orderBy = (
  field: string,
  dir: "ASC" | "DESC" = "ASC",
): SearchOrder => ({ field, dir });
