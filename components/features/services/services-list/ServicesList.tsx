"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { DataTable } from "@/components/ui/data-display/data-table";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
import { useServices } from "@/lib/hooks/services/useServices";
import { useServicesPage } from "@/lib/hooks/services/use-services-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { buildFilter, buildOrder } from "@/lib/services/services";
import { getServicesColumns } from "../table/services-table.config";
import { notify } from "@/lib/utils/notify";

interface ServicesListProps {
  basePath?: string;
}

export function ServicesList({
  basePath = "/settings/services",
}: ServicesListProps) {
  const { handleEditService } = useServicesPage({ basePath });
  const { can, isAdmin } = usePermission();

  const { services, loading, pagination, fetchServices, toggleServiceStatus } =
    useServices();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Filtros/orden/pageSize activos, persistidos para paginación y refetch.
  const activeFiltersRef = useRef<string[]>([]);
  const activeOrdersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  // Construye los filtros actuales (búsqueda + estado). Por defecto se ocultan
  // los servicios inactivos (patrón "Show Hidden").
  const buildCurrentFilters = useCallback(
    (term: string, includeInactive: boolean): string[] => {
      const filters: string[] = [];
      if (term.trim()) filters.push(buildFilter("name", "CONTAINS", term.trim()));
      if (!includeInactive) filters.push(buildFilter("active", "EQ", true));
      return filters;
    },
    [],
  );

  // Carga inicial + recarga al cambiar buscador/estado (debounce 350ms).
  // Es el único efecto de carga (evita un doble fetch en el montaje).
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters = buildCurrentFilters(search, showInactive);
      activeFiltersRef.current = filters;
      fetchServices({
        page: 0,
        pageSize: pageSizeRef.current,
        filters,
        orders: activeOrdersRef.current,
      }).catch((err) => {
        notify.error(err?.message || "Error al cargar servicios");
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, showInactive, fetchServices, buildCurrentFilters]);

  const canEdit = isAdmin || can("service", PermissionAction.EDIT);
  const canBlock = isAdmin || can("service", PermissionAction.BLOCK);

  const columns = useMemo(
    () =>
      getServicesColumns({
        onEdit: handleEditService,
        onToggleStatus: (id, currentlyActive) => {
          toggleServiceStatus(id, currentlyActive)
            .then(() =>
              fetchServices({
                page: 0,
                pageSize: pageSizeRef.current,
                filters: activeFiltersRef.current,
                orders: activeOrdersRef.current,
              }),
            )
            .catch(() => {});
        },
        canEdit,
        canBlock,
      }),
    [handleEditService, toggleServiceStatus, fetchServices, canEdit, canBlock],
  );

  return (
    <section className="bento space-y-4 p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar servicio por nombre..."
            loading={loading}
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-subtle">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(c) => setShowInactive(c === true)}
          />
          Mostrar inactivos
        </label>
      </div>
      <DataTable
        columns={columns}
        data={services}
        loading={loading}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onSortChange={(field, order) => {
          activeOrdersRef.current = order ? [buildOrder(field, order)] : [];
          fetchServices({
            page: 0,
            pageSize: pageSizeRef.current,
            filters: activeFiltersRef.current,
            orders: activeOrdersRef.current,
          });
        }}
        onPageChange={(page, pageSize) => {
          fetchServices({
            page: page - 1,
            pageSize,
            filters: activeFiltersRef.current,
            orders: activeOrdersRef.current,
          });
        }}
      />
    </section>
  );
}
