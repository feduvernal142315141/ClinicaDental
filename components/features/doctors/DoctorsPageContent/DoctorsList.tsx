"use client";

import { useMemo, useEffect, useCallback, useRef, useState } from "react";
import { DataTable } from "@/components/ui/data-display/data-table";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { Select, type SelectOption } from "@/components/ui/controls/select";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { useDoctors } from "@/lib/hooks/doctors";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";
import { getDoctorsColumns } from "../columns/doctors-table.config";
import { useUserTypes } from "@/lib/hooks/userTypes";

/**
 * Convierte el `id` de tipo seleccionado en el filtro estructurado
 * `campo__OPERADOR__valor`. El backend elimina el enum `userType` (String): el
 * campo indexado es `user_type_id` (UUID) → se filtra por `userTypeId` con el
 * VALOR TIPADO como UUID (`UUID:<uuid>`, prefijo que `FilterPaginationQueryModel`
 * parsea a `java.util.UUID`) para que el `equal` se compare UUID↔UUID (comparar
 * un String crudo contra una `Path<UUID>` reventaría el criteria). El front
 * nunca hardcodea la lista de tipos: el `id` viene del catálogo gestionable.
 */
function buildUserTypeFilters(userTypeId: string): string[] {
  return userTypeId ? [`userTypeId__EQ__UUID:${userTypeId}`] : [];
}

interface DoctorsListProps {
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Doctors List Component (Usuarios)
 *
 * Displays a paginated table of clinic users with search, a filter by
 * user type (profession), and actions.
 *
 * @example
 * <DoctorsList basePath="/settings/users" />
 */
export function DoctorsList({
  basePath = "/settings/users",
}: DoctorsListProps) {
  const { handleViewDoctor, handleEditDoctor } = useDoctorsPage({ basePath });

  const { doctors, loading, pagination, fetchDoctors } = useDoctors();

  // El filtro "Tipo" se puebla desde el catálogo gestionable de tipos de
  // usuario (solo activos). El front ya NO conoce una lista fija de tipos.
  const { userTypes } = useUserTypes(false);

  /**
   * Opciones del Select de filtro: "Todos los tipos" + tipos activos del
   * catálogo + los tipos ya ASIGNADOS a doctores de la página actual que no
   * estén en el catálogo activo (archivados), marcados "(archivado)" — así el
   * filtro sigue ofreciendo un tipo archivado que aún tiene personal asignado
   * (espejo de la fusión que hace `DoctorForm`). Sin esto, seleccionar el tipo
   * de esos doctores sería imposible desde la tabla.
   */
  const userTypeFilterOptions: SelectOption[] = useMemo(() => {
    const seen = new Set<string>();
    const options: SelectOption[] = [{ value: "", label: "Todos los tipos" }];

    for (const t of userTypes) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      options.push({ value: t.id, label: t.name });
    }

    for (const doc of doctors) {
      const assigned = doc.userType;
      if (!assigned || seen.has(assigned.id)) continue;
      seen.add(assigned.id);
      options.push({ value: assigned.id, label: `${assigned.name} (archivado)` });
    }

    return options;
  }, [userTypes, doctors]);

  // Fase 2 (GET semántico): la búsqueda viaja como intención plana `q`
  // (el backend barre name). Se persiste `q`, el tipo de usuario y el
  // pageSize actual entre re-renders para reusarlos en la paginación.
  const qRef = useRef<string>("");
  const userTypeRef = useRef<string>("");
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("");

  const handleSearchChange = useCallback(
    (q: string) => {
      qRef.current = q;
      fetchDoctors({
        page: 0,
        pageSize: pageSizeRef.current,
        q,
        filters: buildUserTypeFilters(userTypeRef.current),
      });
    },
    [fetchDoctors],
  );

  const handleUserTypeChange = useCallback(
    (value: string) => {
      userTypeRef.current = value;
      setUserType(value);
      fetchDoctors({
        page: 0,
        pageSize: pageSizeRef.current,
        q: qRef.current,
        filters: buildUserTypeFilters(value),
      });
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-64">
          <Select
            value={userType}
            onChange={handleUserTypeChange}
            options={userTypeFilterOptions}
            placeholder="Filtrar por tipo"
            aria-label="Filtrar usuarios por tipo"
          />
        </div>
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar usuario por nombre..."
          loading={loading}
        />
      </div>
      <DataTable
        columns={columns}
        data={doctors}
        loading={loading}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        emptyText="No se encontraron usuarios."
        onPageChange={(page, pageSize) => {
          fetchDoctors({
            page: page - 1,
            pageSize,
            q: qRef.current,
            filters: buildUserTypeFilters(userTypeRef.current),
          });
        }}
      />
    </section>
  );
}
