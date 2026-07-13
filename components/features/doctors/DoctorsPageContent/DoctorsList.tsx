"use client";

import { useMemo, useEffect, useCallback, useRef, useState } from "react";
import { DataTable } from "@/components/ui/data-display/data-table";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { useDoctors } from "@/lib/hooks/doctors";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";
import { getDoctorsColumns } from "../columns/doctors-table.config";

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

  // Fase 2 (GET semántico): la búsqueda viaja como intención plana `q`
  // (el backend barre name). Se persiste `q` y el pageSize actual entre
  // re-renders para reusarlos en la paginación.
  const qRef = useRef<string>("");
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  const [search, setSearch] = useState("");

  const handleSearchChange = useCallback(
    (q: string) => {
      qRef.current = q;
      fetchDoctors({ page: 0, pageSize: pageSizeRef.current, q });
    },
    [fetchDoctors],
  );

  // Debounce: 350ms tras cambio en el buscador (hook genérico compartido).
  const debouncedSearch = useDebouncedValue(search, 350);
  useEffect(() => {
    handleSearchChange(debouncedSearch.trim());
  }, [debouncedSearch, handleSearchChange]);

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
    <section className="bento space-y-4 p-4 lg:p-5">
      <TableSearch
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
            q: qRef.current,
          });
        }}
      />
    </section>
  );
}
