import {useCallback, useState} from "react";
import {Columns} from "@/components/ui/composed/table/TableModels";

interface UseTableProps {
    columns: Columns[];
    total: number;
    externalPageSize?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onFilterChange?: (filters: Record<string, string>) => void;
}

/**
 * Fase 4: ya no arma un string `?filters=` con dialecto propio (retirado
 * `convertToQueryString`/`convertFilterToType`, ver lib/utils/utils.ts). Este hook solo
 * mantiene el estado de filtro POR COLUMNA (`{ columnKey: value }`) y lo emite tal cual;
 * el consumidor (hoy solo Campañas, vía `useCampaignList`) traduce esas claves a la
 * intención semántica (`q`/facetas) que entiende su propio service.
 */
const useTable = ({
    total,
    externalPageSize = 10,
    onPageChange,
    onPageSizeChange,
    onFilterChange,
}: UseTableProps) => {
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(externalPageSize);

    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [key]: value
            };

            onFilterChange?.(newFilters);

            return newFilters;
        });
    }, [onFilterChange]);

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
