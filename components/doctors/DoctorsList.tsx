"use client";

import { useMemo } from "react";
import { App } from "antd";
import { DataTable, Card } from "@/components/ui/antd";
import { useDoctors } from "@/lib/hooks/doctors";
import { useDoctorsPage } from "@/hooks/use-doctors-page";
import { getDoctorsColumns } from "./doctors-table.config";

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
  const { modal, message } = App.useApp();
  const { handleViewDoctor, handleEditDoctor } = useDoctorsPage({ basePath });

  const { doctors, loading, pagination, fetchDoctors, deleteDoctor } =
    useDoctors();

  const columns = useMemo(
    () =>
      getDoctorsColumns({
        onView: handleViewDoctor,
        onEdit: handleEditDoctor,
      }),
    [handleViewDoctor, handleEditDoctor]
  );

  return (
    <Card>
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
          fetchDoctors({ page: page - 1, pageSize });
        }}
      />
    </Card>
  );
}
