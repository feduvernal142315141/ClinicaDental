"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { App } from "antd";
import { Card, DataTable, TableSearchBar } from "@/components/ui/antd";
import { useServices } from "@/lib/hooks/services/useServices";
import { useServicesPage } from "@/lib/hooks/services/use-services-page";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { buildFilter } from "@/lib/services/services";
import { getServicesColumns } from "../table/services-table.config";

interface ServicesListProps {
  basePath?: string;
}

export function ServicesList({
  basePath = "/settings/services",
}: ServicesListProps) {
  const { message } = App.useApp();
  const { handleEditService } = useServicesPage({ basePath });
  const { can, isAdmin } = usePermission();

  const { services, loading, pagination, fetchServices, toggleServiceStatus } =
    useServices();

  const [search, setSearch] = useState("");

  // Persist active filters and current pageSize across re-renders
  const activeFiltersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  const handleFiltersChange = useCallback(
    (filters: string[]) => {
      activeFiltersRef.current = filters;
      fetchServices({ page: 0, pageSize: pageSizeRef.current, filters }).catch(
        () => {},
      );
    },
    [fetchServices],
  );

  // Carga inicial
  useEffect(() => {
    fetchServices({ page: 0, pageSize: 10 }).catch((err) => {
      message.error(err?.message || "Error al cargar servicios");
    });
  }, [fetchServices, message]);

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

  const canEdit = isAdmin || can("service", PermissionAction.EDIT);
  const canBlock = isAdmin || can("service", PermissionAction.BLOCK);

  const columns = useMemo(
    () =>
      getServicesColumns({
        onEdit: handleEditService,
        onToggleStatus: (id, currentlyActive) => {
          toggleServiceStatus(id, currentlyActive).catch(() => {});
        },
        canEdit,
        canBlock,
      }),
    [handleEditService, toggleServiceStatus, canEdit, canBlock],
  );

  return (
    <Card>
      <TableSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar servicio por nombre..."
        loading={loading}
      />
      <DataTable
        columns={columns}
        data={services}
        loading={loading}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onPageChange={(page, pageSize) => {
          fetchServices({
            page: page - 1,
            pageSize,
            filters: activeFiltersRef.current,
          });
        }}
      />
    </Card>
  );
}
