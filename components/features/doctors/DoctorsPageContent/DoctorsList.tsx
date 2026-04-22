"use client";

import { useMemo, useEffect, useCallback, useRef, useState } from "react";
import { DataTable, Card, TableSearchBar } from "@/components/ui/antd";
import { useDoctors } from "@/lib/hooks/doctors";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";
import { getDoctorsColumns } from "../columns/doctors-table.config";
import { buildFilter } from "@/lib/entity/patients";

interface DoctorsListProps {
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Doctors List Component
 *
 * Displays a paginated table of doctors with search and actions.
 *
 * @example
 * <DoctorsList basePath="/settings/users" />
 */
export function DoctorsList({
  basePath = "/settings/users",
}: DoctorsListProps) {
  const { handleViewDoctor, handleEditDoctor } = useDoctorsPage({ basePath });

  const { doctors, loading, pagination, fetchDoctors } = useDoctors();

  // Persist active filters and current pageSize across re-renders
  const activeFiltersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  const [search, setSearch] = useState("");

  const handleFiltersChange = useCallback(
    (filters: string[]) => {
      activeFiltersRef.current = filters;
      fetchDoctors({ page: 0, pageSize: pageSizeRef.current, filters });
    },
    [fetchDoctors],
  );

  // Debounce: 350ms tras cambio en el buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters = search.trim()
        ? [buildFilter("name", "CONTAINS", search.trim())]
        : [];
      handleFiltersChange(filters);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, handleFiltersChange]);

  // Load doctors on component mount
  useEffect(() => {
    fetchDoctors({ page: 0, pageSize: 10 });
  }, [fetchDoctors]);

  const columns = useMemo(
    () =>
      getDoctorsColumns({
        onView: handleViewDoctor,
        onEdit: handleEditDoctor,
      }),
    [handleViewDoctor, handleEditDoctor],
  );

  return (
    <Card>
      <TableSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar doctor por nombre..."
        loading={loading}
      />
      <DataTable
        columns={columns}
        data={doctors}
        loading={loading}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onPageChange={(page, pageSize) => {
          fetchDoctors({
            page: page - 1,
            pageSize,
            filters: activeFiltersRef.current,
          });
        }}
      />
    </Card>
  );
}
