/**
 * Query de servicios — nombres de columna + azúcar semántico.
 * Dialecto services (4 segmentos, sufijo `__AND`, Date -> AAAA-MM-DD).
 */
import { QueryBuilder, servicesDialect } from "../builder";

/**
 * Campos filtrables/ordenables — nombres EXACTOS del modelo JPA
 * (`ServiceDbModel` + `BaseDbModel`), que es lo que el motor de
 * especificaciones resuelve con `root.get(fieldName)`.
 *
 * Un nombre inexistente no da error de compilación en el backend: revienta
 * (o se descarta) en runtime. Por eso esta unión es la única barrera. Los
 * antiguos `price`/`durationMinutes` NO existen en Java (son `cost`/`duration`)
 * y ordenar por ellos rompía la consulta.
 */
export type ServiceField =
  | "code"
  | "name"
  | "type"
  | "category"
  | "cost"
  | "duration"
  | "odontogramEnabled"
  | "active"
  | "createAt";

/**
 * El separador del dialecto es `__`: si el término del usuario lo contiene,
 * el backend parte el filtro en más segmentos de los esperados y lo DESCARTA
 * en silencio. Se colapsa a un espacio antes de interpolar.
 */
function sanitizeTerm(term: string): string {
  return term.replace(/_{2,}/g, " ").trim();
}

export class ServicesQuery extends QueryBuilder<ServiceField> {
  constructor() {
    super(servicesDialect);
  }

  /**
   * Busca por nombre. El backend aplica `unaccent(lower(...))` en columna y
   * patrón (CONTAINS_IGNORE_CASE), así que "protesis" encuentra "Prótesis"
   * sin necesidad de filtrar en cliente. Ignora términos vacíos.
   */
  search(term: string): this {
    const t = sanitizeTerm(term);
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
