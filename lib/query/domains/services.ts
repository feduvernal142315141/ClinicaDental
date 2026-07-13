/**
 * Query de servicios — nombres de columna + azúcar semántico.
 * Dialecto services (4 segmentos, sufijo `__AND`, Date -> AAAA-MM-DD).
 */
import { QueryBuilder, servicesDialect } from "../builder";

export type ServiceField =
  | "name"
  | "active"
  | "odontogramEnabled"
  | "price"
  | "durationMinutes";

export class ServicesQuery extends QueryBuilder<ServiceField> {
  constructor() {
    super(servicesDialect);
  }

  /** Busca por nombre (case-insensitive). Ignora términos vacíos. */
  search(term: string): this {
    const t = term.trim();
    if (t) this.where("name", "CONTAINS_IGNORE_CASE", t);
    return this;
  }

  active(v: boolean): this {
    return this.where("active", "EQ", v);
  }

  odontogramEnabled(v: boolean): this {
    return this.where("odontogramEnabled", "EQ", v);
  }
}

export const servicesQuery = () => new ServicesQuery();
