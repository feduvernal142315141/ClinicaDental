"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/atomic/data-display/table";
import { cn } from "@/lib/utils/utils";

// ── API (compatible con el antiguo DataTable de antd) ──────────────────
export interface DataTableColumn<T> {
  key: string;
  title: string;
  dataIndex?: string | string[];
  width?: number | string;
  fixed?: "left" | "right";
  ellipsis?: boolean;
  align?: "left" | "center" | "right";
  sorter?: boolean;
  filterable?: boolean;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  onSortChange?: (field: string, order: "asc" | "desc" | null) => void;
  showSizeChanger?: boolean;
  pageSizeOptions?: (string | number)[];
  emptyText?: React.ReactNode;
  className?: string;
  showPagination?: boolean;
  onRowClick?: (record: T) => void;
}

function getValue<T>(record: T, dataIndex?: string | string[]): unknown {
  if (!dataIndex) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>(
      (acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]),
      record,
    );
  }
  return (record as Record<string, unknown>)[dataIndex];
}

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Tabla de datos Bento (shadcn + tokens). Reemplaza el DataTable de antd
 * conservando su API pública: sorting server-driven vía `onSortChange`,
 * paginación controlada, estados de carga y vacío.
 */
export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id",
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onSortChange,
  showSizeChanger = true,
  pageSizeOptions = [10, 20, 50, 100],
  emptyText,
  className,
  showPagination = true,
  onRowClick,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{
    field: string;
    order: "asc" | "desc";
  } | null>(null);

  const keyOf = React.useCallback(
    (record: T, index: number): string => {
      if (typeof rowKey === "function") return rowKey(record);
      const v = (record as Record<string, unknown>)[rowKey];
      return v != null ? String(v) : String(index);
    },
    [rowKey],
  );

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sorter || !onSortChange) return;
    let next: "asc" | "desc" | null;
    if (sort?.field !== col.key) next = "asc";
    else if (sort.order === "asc") next = "desc";
    else next = null;
    setSort(next ? { field: col.key, order: next } : null);
    onSortChange(col.key, next);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const isEmpty = !loading && data.length === 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="overflow-x-auto rounded-xl border border-hairline">
        <Table className="table-compact">
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              {columns.map((col) => {
                const active = sort?.field === col.key;
                return (
                  <TableHead
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      "bg-elevated text-subtle",
                      ALIGN[col.align ?? "left"],
                      col.sorter && "cursor-pointer select-none",
                    )}
                    onClick={() => toggleSort(col)}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "center" && "justify-center",
                        col.align === "right" && "justify-end",
                      )}
                    >
                      {col.title}
                      {col.sorter &&
                        (active ? (
                          sort?.order === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-brand" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-brand" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                        ))}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && data.length === 0 ? (
              Array.from({ length: Math.min(pageSize, 6) }).map((_, r) => (
                <TableRow key={`sk-${r}`} className="border-hairline">
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-hover" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-subtle"
                >
                  {emptyText ?? "No hay datos disponibles"}
                </TableCell>
              </TableRow>
            ) : (
              data.map((record, index) => (
                <TableRow
                  key={keyOf(record, index)}
                  className={cn(
                    "border-hairline hover:bg-hover",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn("text-ink", ALIGN[col.align ?? "left"])}
                    >
                      {col.render
                        ? col.render(getValue(record, col.dataIndex), record, index)
                        : (getValue(record, col.dataIndex) as React.ReactNode) ??
                          "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex flex-col items-center justify-between gap-3 px-1 text-sm text-subtle sm:flex-row">
          <span className="tabular-nums">
            {from}-{to} de {total} registros
          </span>
          <div className="flex items-center gap-2">
            {showSizeChanger && (
              <select
                aria-label="Registros por página"
                value={pageSize}
                onChange={(e) =>
                  onPageChange?.(1, Number(e.target.value))
                }
                className="rounded-lg border border-hairline bg-elevated px-2 py-1 text-sm text-ink outline-none focus:border-brand/40"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / pág.
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1, pageSize)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-hairline bg-elevated text-ink transition-colors hover:bg-hover disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center tabular-nums text-ink">
                {page}
              </span>
              <button
                type="button"
                aria-label="Página siguiente"
                disabled={page >= totalPages}
                onClick={() => onPageChange?.(page + 1, pageSize)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-hairline bg-elevated text-ink transition-colors hover:bg-hover disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
