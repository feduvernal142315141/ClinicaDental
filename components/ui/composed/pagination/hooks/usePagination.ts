import {useCallback, useMemo} from "react";

interface UsePaginationProps {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    maxButtons?: number;
    pageSize?: number;
    totalItems?: number;
}

const usePagination = ({
    totalPages,
    currentPage,
    onPageChange,
    maxButtons = 4,
    pageSize = 10,
    totalItems
}: UsePaginationProps) => {

    // Validar página actual (cálculo simple, no necesita memo)
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

    // Cálculos simples sin useMemo (son operaciones triviales)
    const startItem = totalItems ? (validCurrentPage - 1) * pageSize + 1 : 0;
    const endItem = totalItems ? Math.min(validCurrentPage * pageSize, totalItems) : 0;

    // Callbacks con dependencias REALES (currentPage, totalPages) no derivadas (validCurrentPage)
    const handlePrev = useCallback(() => {
        // Calcular validCurrentPage dentro del callback
        const valid = Math.max(1, Math.min(currentPage, totalPages));
        if (valid > 1) {
            onPageChange(valid - 1);
        }
    }, [currentPage, totalPages, onPageChange]);

    const handleNext = useCallback(() => {
        // Calcular validCurrentPage dentro del callback
        const valid = Math.max(1, Math.min(currentPage, totalPages));
        if (valid < totalPages) {
            onPageChange(valid + 1);
        }
    }, [currentPage, totalPages, onPageChange]);

    // Memoizar solo pageNumbers porque genera un array
    const pageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        const valid = Math.max(1, Math.min(currentPage, totalPages));

        // Si solo hay 1 página o ninguna
        if (totalPages <= 1) return [1];

        // Si el total de páginas es menor o igual al máximo, mostrar todas sin "..."
        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        }

        // Calcular el rango de páginas a mostrar centrado en la página actual
        const halfButtons = Math.floor((maxButtons - 1) / 2);
        let startPage = Math.max(1, valid - halfButtons);
        let endPage = startPage + maxButtons - 1;

        // Ajustar si nos pasamos del total de páginas
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // Mostrar "..." al inicio solo si no estamos cerca del inicio
        if (startPage > 1) {
            pages.push('...');
        }

        // Páginas visibles
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Mostrar "..." al final solo si no estamos cerca del final
        if (endPage < totalPages) {
            pages.push('...');
        }

        return pages;
    }, [currentPage, totalPages, maxButtons]);

    return {
        validCurrentPage,
        startItem,
        endItem,
        handleNext,
        handlePrev,
        pageNumbers
    };
};

export default usePagination;