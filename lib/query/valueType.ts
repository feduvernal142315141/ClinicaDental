/**
 * Value-types y estrategias de formateo de valor — cliente tipado de query
 *
 * Registro de los nombres de value-type que espera el backend
 * (FilterPaginationQueryModel) para uso futuro/Fase 4, más las 3
 * estrategias de formateo de valor que hoy coexisten en el front,
 * modeladas por dialecto (no como un formato global).
 */

/** Nombres backend (referencia; NO se emiten como prefijo en las rutas activas hoy). */
export const FilterValueType = {
  bool: "Boolean",
  list: "List",
  date: "Date",
  dateTime: "DateTime",
  string: "String",
  time: "Time",
  int: "Integer",
  double: "Double",
  UUID: "UUID",
} as const;

export type FilterValueTag = (typeof FilterValueType)[keyof typeof FilterValueType];

export type QueryValue = string | number | boolean | Date;

/**
 * Estrategia A (patients/doctors): valor CRUDO, sin tag.
 * `${value}` === String(value) para primitivos.
 */
export const formatValueRaw = (v: QueryValue): string => String(v);

/**
 * Estrategia B (services): Date -> AAAA-MM-DD (toISOString().split('T')[0]);
 * el resto usa String(v).
 */
export const formatValueServices = (v: QueryValue): string =>
  v instanceof Date ? v.toISOString().split("T")[0] : String(v);

/**
 * Estrategia C (roles — STRAGGLER, separador coma):
 * boolean -> `boolean:${v}`; Date -> `date:${iso}`; resto String(v).
 *
 * NOTA: el prefijo con dos-puntos 'Integer:'/'Boolean:' no se emite en
 * ninguna ruta activa hoy; el underscore 'Integer_5' vive solo en
 * convertToQueryString (Fase 4). No introducirlo aquí.
 */
export const formatValueRoles = (v: QueryValue): string =>
  typeof v === "boolean"
    ? `boolean:${v}`
    : v instanceof Date
      ? `date:${v.toISOString().split("T")[0]}`
      : String(v);
