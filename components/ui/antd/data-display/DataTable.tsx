"use client";

import { Table as AntTable, TableProps as AntTableProps, Empty } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import { useCallback } from "react";

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
  /** Table columns configuration */
  columns: DataTableColumn<T>[];
  /** Data source */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Row key field or function */
  rowKey?: string | ((record: T) => string);
  /** Current page (1-based) */
  page?: number;
  /** Page size */
  pageSize?: number;
  /** Total records count */
  total?: number;
  /** Callback when page changes */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Callback when sort changes */
  onSortChange?: (field: string, order: "asc" | "desc" | null) => void;
  /** Callback when filters change */
  onFilterChange?: (filters: Record<string, FilterValue | null>) => void;
  /** Enable row selection */
  rowSelection?: AntTableProps<T>["rowSelection"];
  /** Custom scroll configuration */
  scroll?: { x?: number | string; y?: number | string };
  /** Table size */
  size?: "small" | "middle" | "large";
  /** Show size changer in pagination */
  showSizeChanger?: boolean;
  /** Page size options */
  pageSizeOptions?: string[];
  /** Custom empty text */
  emptyText?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Whether to show pagination */
  showPagination?: boolean;
  /** Bordered table */
  bordered?: boolean;
}

/**
 * Ant Design Data Table wrapper component
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'name', title: 'Name', dataIndex: 'name' },
 *     { key: 'email', title: 'Email', dataIndex: 'email' },
 *   ]}
 *   data={users}
 *   loading={isLoading}
 *   page={1}
 *   pageSize={10}
 *   total={100}
 *   onPageChange={(page, size) => console.log(page, size)}
 * />
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
  onFilterChange,
  rowSelection,
  scroll,
  size = "middle",
  showSizeChanger = true,
  pageSizeOptions = ["10", "20", "50", "100"],
  emptyText,
  className,
  showPagination = true,
  bordered = false,
}: DataTableProps<T>) {
  // Default empty state
  const defaultEmptyState = (
    <Empty
      description="No hay datos disponibles"
      image={Empty.PRESENTED_IMAGE_DEFAULT}
    />
  );

  // Convert our column format to Ant Design format
  const antColumns: ColumnsType<T> = columns.map((col) => ({
    key: col.key,
    title: col.title,
    dataIndex: col.dataIndex,
    width: col.width,
    fixed: col.fixed,
    ellipsis: col.ellipsis,
    align: col.align,
    sorter: col.sorter,
    render: col.render,
  }));

  // Pagination configuration
  const pagination: TablePaginationConfig | false = showPagination
    ? {
        current: page,
        pageSize,
        total,
        showSizeChanger,
        pageSizeOptions,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} de ${total} registros`,
        onChange: (newPage, newPageSize) => {
          onPageChange?.(newPage, newPageSize);
        },
      }
    : false;

  // Handle table changes (sort, filter, pagination)
  const handleChange = useCallback(
    (
      _pagination: TablePaginationConfig,
      filters: Record<string, FilterValue | null>,
      sorter: SorterResult<T> | SorterResult<T>[]
    ) => {
      // Handle sorting
      if (!Array.isArray(sorter) && sorter.field && onSortChange) {
        const order =
          sorter.order === "ascend"
            ? "asc"
            : sorter.order === "descend"
            ? "desc"
            : null;
        onSortChange(sorter.field as string, order);
      }

      // Handle filters
      if (onFilterChange) {
        onFilterChange(filters);
      }
    },
    [onSortChange, onFilterChange]
  );

  return (
    <AntTable<T>
      columns={antColumns}
      dataSource={data}
      loading={loading}
      rowKey={rowKey}
      pagination={pagination}
      onChange={handleChange}
      rowSelection={rowSelection}
      scroll={scroll}
      size={size}
      bordered={bordered}
      className={className}
      locale={{ emptyText: emptyText || defaultEmptyState }}
    />
  );
}
