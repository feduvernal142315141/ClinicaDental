"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import {
  DataTable,
  DataTableColumn,
  PageCard,
  PageToolbar,
  ActiveStatusTag,
  ActionButtons,
  ActionPresets,
  LoadingSpinner,
} from "@/components/ui/antd";
import { useManagerUsers } from "@/lib/hooks/manager-users";
import { ManagerUserListItem } from "@/lib/entity/manager-users";
import dayjs from "dayjs";

interface ManagerUsersListProps {
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Manager Users List Component
 *
 * Displays a paginated table of manager users with search, filters, and actions.
 * Uses Ant Design components following atomic design principles.
 *
 * @example
 * <ManagerUsersList basePath="/settings/users" />
 */
export function ManagerUsersList({
  basePath = "/settings/users",
}: ManagerUsersListProps) {
  const router = useRouter();
  const { modal, message } = App.useApp();

  const {
    users,
    isLoading,
    error,
    pagination,
    loadUsers,
    refreshUsers,
    setPage,
    setPageSize,
    setFilters,
    filterPresets,
  } = useManagerUsers({ loadOnMount: true, initialPageSize: 10 });

  // Search handler
  const handleSearch = useCallback(
    (value: string) => {
      if (value.trim()) {
        setFilters([filterPresets.byNameContains(value)]);
      } else {
        setFilters([]);
      }
    },
    [setFilters, filterPresets]
  );

  // Navigation handlers
  const handleNewUser = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

  const handleViewUser = useCallback(
    (user: ManagerUserListItem) => {
      router.push(`${basePath}/${user.id}`);
    },
    [router, basePath]
  );

  const handleEditUser = useCallback(
    (user: ManagerUserListItem) => {
      router.push(`${basePath}/${user.id}/edit`);
    },
    [router, basePath]
  );

  const handleDeleteUser = useCallback(
    (user: ManagerUserListItem) => {
      modal.confirm({
        title: "Eliminar Usuario",
        content: `¿Está seguro de eliminar al usuario "${user.names} ${user.surnames}"?`,
        okText: "Eliminar",
        cancelText: "Cancelar",
        okButtonProps: { danger: true },
        onOk: async () => {
          // TODO: Implement delete service
          message.success("Usuario eliminado correctamente");
          refreshUsers();
        },
      });
    },
    [modal, message, refreshUsers]
  );

  // Page change handler
  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setPage(page - 1); // API uses 0-based pagination
      setPageSize(pageSize);
    },
    [setPage, setPageSize]
  );

  // Table columns
  const columns: DataTableColumn<ManagerUserListItem>[] = useMemo(
    () => [
      {
        key: "names",
        title: "Nombre",
        dataIndex: "names",
        sorter: true,
        render: (_, record) => (
          <div>
            <div className="font-medium">
              {record.names} {record.surnames}
            </div>
            <div className="text-sm text-gray-500">{record.email}</div>
          </div>
        ),
      },
      {
        key: "identificationNumber",
        title: "Identificación",
        dataIndex: "identificationNumber",
      },
      {
        key: "cellphone",
        title: "Teléfono",
        dataIndex: "cellphone",
        render: (value) => value || "-",
      },
      {
        key: "role",
        title: "Rol",
        dataIndex: ["role", "name"],
        render: (_, record) => record.role?.name || "-",
      },
      {
        key: "active",
        title: "Estado",
        dataIndex: "active",
        align: "center",
        render: (value) => <ActiveStatusTag active={value} />,
      },
      {
        key: "createAt",
        title: "Fecha Registro",
        dataIndex: "createAt",
        sorter: true,
        render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
      },
      {
        key: "actions",
        title: "Acciones",
        dataIndex: "id",
        align: "center",
        width: 100,
        render: (_, record) => (
          <ActionButtons
            actions={[
              ActionPresets.view(() => handleViewUser(record)),
              ActionPresets.edit(() => handleEditUser(record)),
              ActionPresets.delete(() => handleDeleteUser(record)),
            ]}
          />
        ),
      },
    ],
    [handleViewUser, handleEditUser, handleDeleteUser]
  );

  // Show loading spinner on initial load
  if (isLoading && users.length === 0) {
    return <LoadingSpinner tip="Cargando usuarios..." fullPage />;
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        searchPlaceholder="Buscar por nombre..."
        onSearchChange={handleSearch}
        primaryActionText="Nuevo Usuario"
        onPrimaryAction={handleNewUser}
        onRefresh={refreshUsers}
        loading={isLoading}
      />

      <PageCard
        title="Usuarios del Sistema"
        subtitle={`${pagination.total} usuario${
          pagination.total !== 1 ? "s" : ""
        } registrado${pagination.total !== 1 ? "s" : ""}`}
      >
        <DataTable
          columns={columns}
          data={users}
          loading={isLoading}
          rowKey="id"
          page={pagination.page + 1} // Convert to 1-based for UI
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={handlePageChange}
          scroll={{ x: 900 }}
        />
      </PageCard>
    </div>
  );
}
