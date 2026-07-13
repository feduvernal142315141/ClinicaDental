/**
 * Query de roles — nombres de columna + azúcar semántico + vocabulario de
 * operador propio (minúsculas). Dialecto roles (coma, lowercase).
 * Centraliza el type de operador que hoy vive suelto en lib/entity/roles.
 */
import { QueryBuilder, rolesDialect } from "../builder";

export type RoleField = "name";

/**
 * Vocabulario histórico del straggler de roles (minúsculas). NO es el enum
 * backend canónico (ver lib/query/operators.ts); se conserva idéntico para
 * no romper el wire `field,op,value` que ya consume el backend de roles.
 */
export type RolesFilterOperator =
  | "eq"
  | "ne"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gte"
  | "lte";

export class RolesQuery extends QueryBuilder<RoleField> {
  constructor() {
    super(rolesDialect);
  }

  /** Busca por nombre. Ignora términos vacíos. Emite `name,contains,<q>`. */
  search(q: string): this {
    const term = q.trim();
    if (term) this.where("name", "contains", term);
    return this;
  }
}

export const rolesQuery = () => new RolesQuery();
