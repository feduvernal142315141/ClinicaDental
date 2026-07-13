/**
 * Fase 4: se retiró el dialecto legado de filtro por-columna (filterOperator/filterType/
 * relatedField + FilterObject/FieldMapping), que solo existía para alimentar
 * `convertToQueryString` (ver lib/utils/utils.ts, ahora eliminado). `onFilterChange` emite el
 * mapa CRUDO `{ columnKey: value }`; cada dominio consumidor (hoy solo Campañas) traduce esas
 * claves a la intención semántica (`q`/facetas) que entiende su propio service.
 */
export interface TableProps<T extends Record<string, unknown>> {
    columns: Columns[];
    data: T[];
    total: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    onPageSizeChange?: (pageSize: number) => void;
    onFilterChange?: (filters: Record<string, string>) => void;
}

export interface Columns<T = unknown> {
    key: string;
    title: string;
    className?: string;
    filterable?: boolean;
    customFilters?: (value: unknown, row: T) => React.ReactNode;
    customCell?: (value: unknown, row: T) => React.ReactNode;

}