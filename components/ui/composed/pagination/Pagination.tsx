import * as React from "react";
import { Button, Flex, Select, Text } from "@radix-ui/themes";
import usePagination from "@/components/ui/composed/pagination/hooks/usePagination";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  maxButtons?: number; // máximo de botones de página a mostrar (default: 4)
  pageSize?: number; // elementos por página
  totalItems?: number; // total de elementos
  onPageSizeChange?: (pageSize: number) => void; // callback cuando cambia el tamaño de página
  pageSizeOptions?: number[]; // opciones de tamaño de página (default: [10, 20, 50, 100])
}

export const Pagination: React.FC<PaginationProps> = ({
  totalPages,
  currentPage,
  onPageChange,
  maxButtons = 4,
  pageSize = 10,
  totalItems,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const {
    validCurrentPage,
    startItem,
    endItem,
    handleNext,
    handlePrev,
    pageNumbers,
  } = usePagination({
    totalPages,
    currentPage,
    onPageChange,
    maxButtons,
    pageSize,
    totalItems,
  });

  return (
    <Flex gap="4" align="center" justify="between" style={{ width: "100%" }}>
      {/* Botones de navegación */}
      <Flex gap="1" align="center">
        {/* Ir a la primera página */}
        <Button
          disabled={validCurrentPage === 1}
          onClick={() => onPageChange(1)}
          variant="soft"
          size="2"
        >
          «
        </Button>

        {/* Página anterior */}
        <Button
          disabled={validCurrentPage === 1}
          onClick={handlePrev}
          variant="soft"
          size="2"
        >
          ‹
        </Button>

        {/* Números de página */}
        {pageNumbers.map((item, index) =>
          item === "..." ? (
            <Button
              key={`ellipsis-${index}`}
              variant="soft"
              size="2"
              disabled
              style={{
                minWidth: "40px",
                cursor: "default",
              }}
            >
              ...
            </Button>
          ) : (
            <Button
              key={`page-${item}`}
              variant={item === validCurrentPage ? "solid" : "soft"}
              onClick={() => onPageChange(item as number)}
              aria-current={item === validCurrentPage ? "page" : undefined}
              size="2"
              style={{
                minWidth: "40px",
                backgroundColor:
                  item === validCurrentPage ? "#1e3a8a" : undefined,
                color: item === validCurrentPage ? "white" : undefined,
              }}
            >
              {item}
            </Button>
          )
        )}

        {/* Página siguiente */}
        <Button
          disabled={validCurrentPage === totalPages}
          onClick={handleNext}
          variant="soft"
          size="2"
        >
          ›
        </Button>

        {/* Ir a la última página */}
        <Button
          disabled={validCurrentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          variant="soft"
          size="2"
        >
          »
        </Button>
      </Flex>

      {/* Selector de items por página y contador */}
      {(onPageSizeChange || totalItems) && (
        <Flex gap="3" align="center">
          {/* Selector de items por página */}
          {onPageSizeChange && (
            <Flex gap="2" align="center">
              <Select.Root
                value={String(pageSize)}
                onValueChange={(value) => onPageSizeChange(Number(value))}
                size="2"
              >
                <Select.Trigger />
                <Select.Content>
                  {pageSizeOptions.map((option) => (
                    <Select.Item key={option} value={String(option)}>
                      {option}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Text size="2" color="gray">
                elementos por pàgina
              </Text>
            </Flex>
          )}

          {/* Contador de items */}
          {totalItems && (
            <Text size="2" color="gray" style={{ whiteSpace: "nowrap" }}>
              {startItem} - {endItem} de {totalItems} elementos
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
};
