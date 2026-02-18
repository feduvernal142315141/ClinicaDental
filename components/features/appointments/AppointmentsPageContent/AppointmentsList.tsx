"use client";

import { useMemo } from "react";
import { Empty } from "antd";
import { Card, DataTable } from "@/components/ui/antd";
import { getAvailabilityColumns } from "../columns/appointments-table.config";
import type { AvailabilitySlot } from "@/lib/entity/appointment";

interface AppointmentsListProps {
  slots: AvailabilitySlot[];
  loading?: boolean;
  onScheduleSlot?: (slot: AvailabilitySlot) => void;
  emptyDescription?: string;
}

export function AppointmentsList({
  slots,
  loading = false,
  onScheduleSlot,
  emptyDescription = "Seleccione doctor y fecha para ver disponibilidad",
}: AppointmentsListProps) {
  const columns = useMemo(
    () =>
      getAvailabilityColumns({
        onSchedule: onScheduleSlot,
      }),
    [onScheduleSlot],
  );

  return (
    <Card title="Horarios Disponibles">
      <DataTable
        columns={columns}
        data={slots}
        loading={loading}
        rowKey="id"
        showPagination={false}
        emptyText={
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyDescription}
          />
        }
      />
    </Card>
  );
}
