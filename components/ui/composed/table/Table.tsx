"use client";

import { Table } from "@radix-ui/themes";
import React from "react";
import { Input } from "@/components/ui/atomic/forms/input";
import { Pagination } from "@/components/ui/composed/pagination/Pagination";
import { TableProps } from "@/components/ui/composed/table/TableModels";
import useTable from "@/components/ui/composed/table/hooks/useTable";

export function CustomTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  onPageChange,
  pageSize: externalPageSize,
  onPageSizeChange,
  onFilterChange,
}: TableProps<T>) {
  const {
    filters,
    page,
    pageSize,
    handleFilterChange,
    handlePageSizeChange,
    handlePageChange,
    totalPages,
  } = useTable({
    columns,
    total,
    externalPageSize,
    onPageChange,
    onPageSizeChange,
    onFilterChange,
  });

  return (
    <div className="w-full overflow-hidden rounded-lg border border-hairline">
      <div className="overflow-x-auto">
        <Table.Root
          style={{
            width: "100%",
            tableLayout: "fixed",
            display: "table",
          }}
        >
          <Table.Header>
            <Table.Row className="bg-hover">
              {columns.map((column, index) => (
                <Table.ColumnHeaderCell
                  key={`header-${column.key}-${index}`}
                  className="p-3 font-semibold text-ink border-b border-hairline"
                >
                  <div className="space-y-2">
                    <div>{column.title}</div>
                    {column.filterable &&
                      (column.customFilters ? (
                        column.customFilters(handleFilterChange, "")
                      ) : (
                        <Input
                          placeholder={`Filtrar ${column.title.toLowerCase()}...`}
                          value={filters[column.key] || ""}
                          onChange={(e) =>
                            handleFilterChange(column.key, e.target.value)
                          }
                          className="h-8 text-sm font-normal bg-elevated border-hairline text-ink"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ))}
                  </div>
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {data.map((row, rowIndex) => (
              <Table.Row key={`row-${rowIndex}`}>
                {columns.map((column, colIndex) => (
                  <Table.Cell
                    key={`cell-${rowIndex}-${column.key}-${colIndex}`}
                    className={`p-3 text-subtle align-middle ${
                      column.className || ""
                    }`}
                    style={{ verticalAlign: "middle" }}
                  >
                    {column.customCell
                      ? column.customCell(row[column.key], row)
                      : row[column.key] ?? "-"}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <div
          className={"p-3 border-t border-hairline bg-hover"}
        >
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            totalItems={total}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </div>
  );
}
