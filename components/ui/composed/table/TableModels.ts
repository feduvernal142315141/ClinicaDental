import {FilterOperatorType} from "@/lib/models/filterOperator";


export interface TableProps<T extends Record<string, unknown>> {
    columns: Columns[];
    data: T[];
    total: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    onPageSizeChange?: (pageSize: number) => void;
    onFilterChange?: (filters: string) => void;
}

export interface Columns<T = unknown> {
    key: string;
    title: string;
    className?: string;
    filterable?: boolean;
    filterOperator?: FilterOperatorType;
    filterType?:
        | 'boolean'
        | 'text'
        | 'numeric'
        | 'numericText'
        | 'date'
        | 'datetime'
        | 'dateRange'
        | undefined;
    relatedField?: string;
    customFilters?: (value: unknown, row: T) => React.ReactNode;
    customCell?: (value: unknown, row: T) => React.ReactNode;

}

export interface FilterObject {
    logic: string;
    filters: Filter[];
}

export interface Filter {
    field: string;
    operator: string;
    value: string;
}

export interface FieldMapping {
    field: string;
    type?: string;
    relatedField?: string;
}