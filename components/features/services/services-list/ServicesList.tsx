"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Input, Space } from "antd";
import { Card, DataTable } from "@/components/ui/antd";
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

  useEffect(() => {
    fetchServices({ page: 0, pageSize: 10 }).catch((err) => {
      message.error(err?.message || "Error al cargar servicios");
    });
  }, [fetchServices, message]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters = search.trim()
        ? [buildFilter("name", "contains", search.trim())]
        : [];

      fetchServices({
        page: 0,
        pageSize: pagination.pageSize,
        filters,
      }).catch(() => {
        // errors are already surfaced by useServices
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [search, fetchServices, pagination.pageSize]);

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
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Input.Search
          placeholder="Buscar servicios por nombre"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            const filters = search.trim()
              ? [buildFilter("name", "contains", search.trim())]
              : [];
            fetchServices({ page: page - 1, pageSize, filters });
          }}
        />
      </Space>
    </Card>
  );
}
