"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Input, Space } from "antd";
import { Card, DataTable } from "@/components/ui/antd";
import { useRoles } from "@/lib/hooks/roles/useRoles";
import { useRolesPage } from "@/lib/hooks/roles/use-roles-page";
import { buildFilter } from "@/lib/services/roles";
import { getRolesColumns } from "../table/roles-table.config";

interface RolesListProps {
  basePath?: string;
}

export function RolesList({ basePath = "/settings/roles" }: RolesListProps) {
  const { message } = App.useApp();
  const { handleEditRole } = useRolesPage({ basePath });

  const { roles, loading, pagination, fetchRoles } = useRoles();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRoles({ page: 0, pageSize: 10 }).catch((err) => {
      message.error(err?.message || "Error al cargar roles");
    });
  }, [fetchRoles, message]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters = search.trim()
        ? [buildFilter("name", "contains", search.trim())]
        : [];

      fetchRoles({
        page: 0,
        pageSize: pagination.pageSize,
        filters,
      }).catch(() => {
        // errors are already surfaced by useRoles
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [search, fetchRoles, pagination.pageSize]);

  const columns = useMemo(
    () =>
      getRolesColumns({
        onEdit: handleEditRole,
      }),
    [handleEditRole]
  );

  return (
    <Card>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Input.Search
          placeholder="Buscar roles por nombre"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            const filters = search.trim()
              ? [buildFilter("name", "contains", search.trim())]
              : [];
            fetchRoles({ page: page - 1, pageSize, filters });
          }}
        />
      </Space>
    </Card>
  );
}
