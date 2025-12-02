import {useCallback, useState} from "react";
import {FieldMapping, Columns} from "@/components/ui/table/TableModels";
import {FilterOperator} from "@/lib/models/filterOperator";
import {convertFilterToType, convertToQueryString} from "@/lib/utils/utils";

interface UseTableProps {
    columns: Columns[];
    total: number;
    externalPageSize?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onFilterChange?: (filters: string) => void;
}

const useTable = ({
    columns,
    total,
    externalPageSize = 10,
    onPageChange,
    onPageSizeChange,
    onFilterChange,
}: UseTableProps) => {
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(externalPageSize);

    // No necesitamos useRef - usamos el callback de setFilters
    const handleFilterChange = useCallback((key: string, value: string) => {
        // Actualizar estado Y procesar los filtros en un solo lugar
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [key]: value
            };

            // Construir el query con los filtros actualizados
            const fieldMappings: FieldMapping[] = [];
            
            const objectFilter = Object.keys(newFilters).map(filterKey => {
                const field = filterKey;
                const val = newFilters[filterKey];
                const operator = columns.find(
                    column => column.key === filterKey
                )?.filterOperator || FilterOperator.contains;

                return {
                    field,
                    value: val,
                    operator,
                };
            });

            columns.forEach((column) => {
                fieldMappings.push({
                    field: column.key,
                    type: convertFilterToType(column?.filterType ?? 'string'),
                    relatedField: column?.relatedField ?? '',
                });
            });

            if (onFilterChange) {
                onFilterChange(convertToQueryString(
                    {
                        logic: "and",
                        filters: objectFilter
                    },
                    fieldMappings,
                    columns,
                ));
            }

            return newFilters;
        });
    }, [columns, onFilterChange]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPageSize(newPageSize);
        setPage(1);
        onPageChange(1);
        if (onPageSizeChange) {
            onPageSizeChange(newPageSize);
        }
    }, [onPageChange, onPageSizeChange]); // Dependencias correctas

    const handlePageChangeInternal = useCallback((newPage: number) => {
        setPage(newPage);
        onPageChange(newPage);
    }, [onPageChange]); // Solo onPageChange como dependencia

    // Cálculo simple sin useMemo
    const totalPages = Math.ceil(total / pageSize);

    return {
        filters,
        page,
        pageSize,
        handleFilterChange,
        handlePageSizeChange,
        handlePageChange: handlePageChangeInternal,
        totalPages,
    };
};

export default useTable;