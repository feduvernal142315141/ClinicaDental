"use client";

import { useMemo, useEffect } from "react";
import { App } from "antd";
import { DataTable, Card } from "@/components/ui/antd";
import { usePatients, usePatientsPage } from "@/lib/hooks/patients";
import { getPatientsColumns } from "../columns/patients-table.config";
import type { Patient } from "@/lib/entity/patients";

interface PatientListProps {
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Patients List Component
 *
 * Displays a paginated table of patients with search, filters, and actions.
 *
 * @example
 * <PatientList basePath="/patients" />
 */
export function PatientList({ basePath = "/patients" }: PatientListProps) {
  const { modal, message } = App.useApp();
  const { handleViewPatient, handleEditPatient } = usePatientsPage({
    basePath,
  });

  const { patients, loading, pagination, fetchPatients, deletePatient } =
    usePatients();

  // Load patients on component mount
  useEffect(() => {
    fetchPatients({ page: 0, pageSize: 10 });
  }, [fetchPatients]);

  const handleDelete = (patient: Patient) => {
    modal.confirm({
      title: "¿Eliminar paciente?",
      content: (
        <>
          Esta acción no se puede deshacer. Se eliminará permanentemente la
          información del paciente <strong>{patient.name}</strong> y todos sus
          datos asociados.
        </>
      ),
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await deletePatient(patient.id);
          message.success("Paciente eliminado correctamente");
          // Refetch current page
          fetchPatients({
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        } catch (e) {
          message.error("No se pudo eliminar el paciente");
        }
      },
    });
  };

  const columns = useMemo(
    () =>
      getPatientsColumns({
        onView: handleViewPatient,
        onEdit: handleEditPatient,
        onDelete: handleDelete,
      }),
    [handleViewPatient, handleEditPatient],
  );

  return (
    <Card>
      <DataTable
        columns={columns}
        data={patients}
        loading={loading}
        rowKey="id"
        page={Math.max(pagination.page + 1, 1)}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onPageChange={(page, pageSize) => {
          fetchPatients({ page: page - 1, pageSize });
        }}
      />
    </Card>
  );
}
