"use client";

import { useCallback, useEffect, useMemo } from "react";
import { App } from "antd";
import { Card, DataTable } from "@/components/ui/antd";
import { useAppointments } from "@/lib/hooks/appointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import { getAppointmentsColumns } from "../columns/appointments-table.config";
import type { Appointment } from "@/lib/entity/appointment";

interface AppointmentsListProps {
  basePath?: string;
  canEdit?: boolean;
  canCancel?: boolean;
  /** Called whenever appointments data is loaded/refreshed */
  onDataLoaded?: (appointments: Appointment[], loading: boolean) => void;
}

export function AppointmentsList({
  basePath = "/appointments",
  canEdit = false,
  canCancel = false,
  onDataLoaded,
}: AppointmentsListProps) {
  const { modal } = App.useApp();

  const { handleViewAppointment, handleEditAppointment } = useAppointmentsPage({
    basePath,
  });

  const {
    appointments,
    loading,
    pagination,
    fetchAppointments,
    cancelAppointment,
  } = useAppointments();

  useEffect(() => {
    fetchAppointments({ page: 0, pageSize: 10 }).catch(() => {
      // Error already handled by useAppointments hook (message.error)
    });
  }, [fetchAppointments]);

  useEffect(() => {
    onDataLoaded?.(appointments, loading);
  }, [appointments, loading, onDataLoaded]);

  const handleCancel = useCallback(
    (appointment: Appointment) => {
      modal.confirm({
        title: "¿Cancelar cita?",
        content: `La cita de ${appointment.patientName || "paciente"} pasará a estado cancelada.`,
        okText: "Cancelar cita",
        okType: "danger",
        cancelText: "Volver",
        onOk: async () => {
          await cancelAppointment(appointment.id);
          await fetchAppointments({
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        },
      });
    },
    [
      modal,
      cancelAppointment,
      fetchAppointments,
      pagination.page,
      pagination.pageSize,
    ],
  );

  const columns = useMemo(
    () =>
      getAppointmentsColumns({
        onView: handleViewAppointment,
        onEdit: canEdit ? handleEditAppointment : undefined,
        onCancel: canCancel ? handleCancel : undefined,
      }),
    [
      handleViewAppointment,
      handleEditAppointment,
      handleCancel,
      canEdit,
      canCancel,
    ],
  );

  return (
    <Card>
      <DataTable
        columns={columns}
        data={appointments}
        loading={loading}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onPageChange={(page, pageSize) => {
          fetchAppointments({ page: page - 1, pageSize });
        }}
      />
    </Card>
  );
}
