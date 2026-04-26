"use client";

import { useMemo, useEffect, useCallback, useRef } from "react";
import { App } from "antd";
import { DataTable, Card } from "@/components/ui/antd";
import {
  usePatients,
  usePatientsPage,
  usePatientFilters,
} from "@/lib/hooks/patients";
import { getPatientsColumns } from "../columns/patients-table.config";
import { PatientSearchBar } from "./PatientSearchBar";
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

  const { patients, loading, pagination, fetchPatients, deletePatient, activatePatient } =
    usePatients();

  // Persist active filters and current pageSize across re-renders
  const activeFiltersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  const handleFiltersChange = useCallback(
    (filters: string[]) => {
      activeFiltersRef.current = filters;
      fetchPatients({ page: 0, pageSize: pageSizeRef.current, filters });
    },
    [fetchPatients],
  );

  const { search, setSearch } = usePatientFilters(handleFiltersChange);

  // Load patients on component mount
  useEffect(() => {
    fetchPatients({ page: 0, pageSize: 10 });
  }, [fetchPatients]);

  const handleDelete = (patient: Patient) => {
    modal.confirm({
      title: "¿Desactivar paciente?",
      content: (
        <>
          El paciente <strong>{patient.name}</strong> ya no aparecerá en las
          búsquedas activas, pero su historial clínico y de pagos se mantendrá
          intacto.
        </>
      ),
      okText: "Desactivar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await deletePatient(patient.id);
          fetchPatients({
            page: pagination.page,
            pageSize: pagination.pageSize,
            filters: activeFiltersRef.current,
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
          message.error("No se pudo desactivar el paciente");
        }
      },
    });
  };

  const handleToggleStatus = (patient: Patient) => {
    modal.confirm({
      title: "¿Activar paciente?",
      content: (
        <>
          El paciente <strong>{patient.name}</strong> volverá a aparecer en las
          búsquedas activas.
        </>
      ),
      okText: "Activar",
      cancelText: "Cancelar",
      cancelButtonProps: { danger: true, type: "default" },
      onOk: async () => {
        try {
          await activatePatient(patient.id);
          fetchPatients({
            page: pagination.page,
            pageSize: pagination.pageSize,
            filters: activeFiltersRef.current,
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
          message.error("No se pudo activar el paciente");
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
        onToggleStatus: handleToggleStatus,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleViewPatient, handleEditPatient],
  );

  return (
    <Card>
      <PatientSearchBar value={search} onChange={setSearch} loading={loading} />
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
          fetchPatients({
            page: page - 1,
            pageSize,
            filters: activeFiltersRef.current,
          });
        }}
      />
    </Card>
  );
}
