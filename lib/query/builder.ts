/**
 * Builder fluido de queries — cliente tipado de filtros/orden (Fase 1)
 *
 * Único lugar del front que sabe cómo se arma el string de filtro/orden
 * para cada dialecto backend. Reutiliza el motor backend existente (mismo
 * separador "__", mismos operadores, mismo formato de orden); esto es
 * puro refactor de front — el wire no cambia.
 */
import type { FilterOperatorName } from "./operators";
import {
  formatValueRaw,
  formatValueRoles,
  formatValueServices,
  type QueryValue,
} from "./valueType";

export interface QueryDialect {
  formatFilter(
    field: string,
    op: string,
    value: QueryValue,
    logic?: "AND" | "OR",
  ): string;
  formatOrder(field: string, dir: "asc" | "desc"): string;
}

/** A — patients/doctors: `field__OP__value` (3 segmentos, sin lógica, orden UPPERCASE). */
export const standardDialect: QueryDialect = {
  formatFilter: (f, op, v) => `${f}__${op}__${formatValueRaw(v)}`,
  formatOrder: (f, d) => `${f}__${d.toUpperCase()}`,
};

/** B — services: `field__OP__value__AND` (4 segmentos, default AND, orden UPPERCASE). */
export const servicesDialect: QueryDialect = {
  formatFilter: (f, op, v, logic = "AND") =>
    `${f}__${op}__${formatValueServices(v)}__${logic}`,
  formatOrder: (f, d) => `${f}__${d.toUpperCase()}`,
};

/** C — roles STRAGGLER: `field,op,value` (coma, boolean:/date:, orden LOWERCASE). */
export const rolesDialect: QueryDialect = {
  formatFilter: (f, op, v) => `${f},${op},${formatValueRoles(v)}`,
  formatOrder: (f, d) => `${f},${d}`,
};

export interface BuiltQuery {
  filters: string[];
  orders: string[];
  page?: number;
  pageSize?: number;
}

/**
 * `op` está tipado al enum canónico PERO acepta cualquier string suelto
 * (roles pasa 'contains'/'eq' en minúscula, vocabulario propio del
 * straggler). El builder interpola el operador CRUDO: no lo normaliza,
 * por eso preserva byte-a-byte lo que cada dominio ya emitía.
 */
type OpArg = FilterOperatorName | (string & {});

export class QueryBuilder<F extends string = string> {
  private readonly filterParts: string[] = [];
  private readonly orderParts: string[] = [];
  private pageValue?: number;
  private pageSizeValue?: number;

  constructor(private readonly dialect: QueryDialect = standardDialect) {}

  where(field: F, op: OpArg, value: QueryValue, logic?: "AND" | "OR"): this {
    this.filterParts.push(
      this.dialect.formatFilter(field, op as string, value, logic),
    );
    return this;
  }

  order(field: F, dir: "asc" | "desc"): this {
    this.orderParts.push(this.dialect.formatOrder(field, dir));
    return this;
  }

  page(page: number, pageSize?: number): this {
    this.pageValue = page;
    this.pageSizeValue = pageSize;
    return this;
  }

  build(): BuiltQuery {
    return {
      filters: [...this.filterParts],
      orders: [...this.orderParts],
      page: this.pageValue,
      pageSize: this.pageSizeValue,
    };
  }
}

export const createQuery = <F extends string = string>(
  dialect: QueryDialect = standardDialect,
) => new QueryBuilder<F>(dialect);
