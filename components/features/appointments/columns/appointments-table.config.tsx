import { ActionButtons, DataTableColumn } from "@/components/ui/antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AvailabilitySlot } from "@/lib/entity/appointment";

interface GetAvailabilityColumnsParams {
  onSchedule?: (slot: AvailabilitySlot) => void;
}

export function getAvailabilityColumns({
  onSchedule,
}: GetAvailabilityColumnsParams): DataTableColumn<AvailabilitySlot>[] {
  const columns: DataTableColumn<AvailabilitySlot>[] = [
    {
      key: "date",
      title: "Fecha",
      dataIndex: "date",
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      key: "time",
      title: "Hora",
      dataIndex: "time",
      align: "center",
      render: (value) => value || "-",
    },
    {
      key: "doctorName",
      title: "Doctor",
      dataIndex: "doctorName",
      render: (value) => value || "Doctor seleccionado",
    },
    {
      key: "interval",
      title: "Intervalo",
      dataIndex: "interval",
      align: "center",
      render: (value) => (value ? `${value} min` : "-"),
    },
  ];

  if (onSchedule) {
    columns.push({
      key: "actions",
      title: "Acciones",
      align: "center",
      width: 140,
      render: (_, record) => (
        <ActionButtons
          actions={[
            {
              key: "schedule",
              label: "Agendar",
              icon: <CalendarOutlined />,
              onClick: () => onSchedule(record),
            },
          ]}
        />
      ),
    });
  }

  return columns;
}

// Backward-compatible export name.
export const getAppointmentsColumns = getAvailabilityColumns;
