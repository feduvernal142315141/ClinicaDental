"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import {
  DataTable,
  DataTableColumn,
  PageCard,
  PageToolbar,
  StatusTag,
  ActionButtons,
  LoadingSpinner,
} from "@/components/ui/antd";
import { useDoctors } from "@/lib/hooks/doctors";
import { DoctorListItem } from "@/lib/entity/doctors";
import dayjs from "dayjs";

interface DoctorsListProps {
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Doctors List Component
 *
 * Displays a paginated table of doctors with search, filters, and actions.
 *
 * @example
 * <DoctorsList basePath="/settings/users" />
 */
export function DoctorsList({
  basePath = "/settings/users",
}: DoctorsListProps) {
  const router = useRouter();
  const { modal, message } = App.useApp();

  const { doctors, isLoading, pagination, loadDoctors, refresh } = useDoctors();

  // Navigation handlers
  const handleNewDoctor = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

  const handleViewDoctor = useCallback(
    (doctor: DoctorListItem) => {
      router.push(`${basePath}/${doctor.id}`);
    },
    [router, basePath]
  );

  const handleEditDoctor = useCallback(
    (doctor: DoctorListItem) => {
      router.push(`${basePath}/${doctor.id}/edit`);
    },
    [router, basePath]
  );

  // Table columns
  const columns: DataTableColumn<DoctorListItem>[] = useMemo(
    () => [
      {
        key: "name",
        title: "Nombre",
        dataIndex: "name",
        sorter: true,
        render: (_, record) => (
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-sm text-gray-500">{record.email}</div>
          </div>
        ),
      },
      {
        key: "licenceNumber",
        title: "Licencia",
        dataIndex: "licenceNumber",
      },
      {
        key: "phone",
        title: "Teléfono",
        dataIndex: "phone",
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
        render: (value) => (
          <StatusTag
            status={value ? "success" : "error"}
            text={value ? "Activo" : "Inactivo"}
          />
        ),
      },
      {
        key: "createAt",
        title: "Fecha Creación",
        dataIndex: "createAt",
        render: (value) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        key: "actions",
        title: "Acciones",
        align: "center",
        fixed: "right",
        width: 120,
        render: (_, record) => (
          <ActionButtons
            actions={[
              {
                key: "view",
                label: "Ver",
                onClick: () => handleViewDoctor(record),
              },
              {
                key: "edit",
                label: "Editar",
                onClick: () => handleEditDoctor(record),
              },
            ]}
          />
        ),
      },
    ],
    [handleViewDoctor, handleEditDoctor]
  );

  if (isLoading && doctors.length === 0) {
    return <LoadingSpinner tip="Cargando doctores..." fullPage />;
  }

  return (
    <PageCard
      title="Gestión de Doctores"
      subtitle="Administre los doctores del sistema"
    >
      <PageToolbar
        searchPlaceholder="Buscar por nombre..."
        onSearch={(value) => {
          // TODO: Implement search
          console.log("Search:", value);
        }}
        actions={[
          {
            key: "new",
            label: "Nuevo Doctor",
            type: "primary",
            onClick: handleNewDoctor,
          },
          {
            key: "refresh",
            label: "Refrescar",
            onClick: refresh,
          },
        ]}
      />

      <DataTable
        columns={columns}
        dataSource={doctors}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: pagination.page + 1,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} doctores`,
        }}
      />
    </PageCard>
  );
}
