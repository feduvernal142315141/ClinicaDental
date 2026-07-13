"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-display/data-table";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { useRoles } from "@/lib/hooks/roles/useRoles";
import { useRolesPage } from "@/lib/hooks/roles/use-roles-page";
import { getRolesColumns } from "../table/roles-table.config";
import { notify } from "@/lib/utils/notify";

interface RolesListProps {
  basePath?: string;
}

export function RolesList({ basePath = "/settings/roles" }: RolesListProps) {
  const { handleEditRole } = useRolesPage({ basePath });

  const { roles, loading, pagination, fetchRoles } = useRoles();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRoles({ page: 0, pageSize: 10 }).catch((err) => {
      notify.error(err?.message || "Error al cargar roles", {
        description:
          "No pudimos obtener la lista de roles. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
      });
    });
  }, [fetchRoles]);

  // Debounced search — Fase 2 (GET semántico): emitimos INTENCIÓN plana `{ q }`
  // (hook genérico compartido); el backend barre `name` server-side.
  const debouncedSearch = useDebouncedValue(search, 500);
  useEffect(() => {
    fetchRoles({
      page: 0,
      pageSize: pagination.pageSize,
      q: debouncedSearch.trim(),
    }).catch(() => {
      // errors are already surfaced by useRoles
    });
  }, [debouncedSearch, fetchRoles, pagination.pageSize]);

  const columns = useMemo(
    () =>
      getRolesColumns({
        onEdit: handleEditRole,
      }),
    [handleEditRole]
  );

  return (
    <section className="bento space-y-4 p-4 lg:p-5">
      <TableSearch
        value={search}
        onChange={setSearch}
        placeholder="Buscar roles por nombre"
        loading={loading}
      />
      <DataTable
        columns={columns}
        data={roles}
        loading={loading}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onPageChange={(page, pageSize) => {
          fetchRoles({ page: page - 1, pageSize, q: search.trim() });
        }}
      />
    </section>
  );
}
