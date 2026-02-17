import { ActionButtons, DataTableColumn, StatusTag } from "@/components/ui/antd";
import {
  EditOutlined,
  EyeOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { Appointment } from "@/lib/entity/appointment";
import dayjs from "dayjs";

interface GetAppointmentsColumnsParams {
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (appointment: Appointment) => void;
}

function getStatusConfig(status: Appointment["status"]): {
  type: "success" | "error" | "warning" | "info";
  label: string;
} {
  switch (status) {
    case "completed":
      return { type: "success", label: "Completada" };
    case "cancelled":
      return { type: "error", label: "Cancelada" };
    case "no-show":
      return { type: "warning", label: "No asistió" };
    case "scheduled":
    default:
      return { type: "info", label: "Programada" };
  }
}

export function getAppointmentsColumns({
  onView,
  onEdit,
  onCancel,
}: GetAppointmentsColumnsParams): DataTableColumn<Appointment>[] {
  return [
    {
      key: "date",
      title: "Fecha",
      dataIndex: "date",
      sorter: true,
      render: (value, record) => (
        <div>
          <div className="font-medium">
            {value ? dayjs(value).format("DD/MM/YYYY") : "-"}
          </div>
          <div className="text-sm text-gray-500">{record.time || "-"}</div>
        </div>
      ),
    },
    {
      key: "patientName",
      title: "Paciente",
      dataIndex: "patientName",
      render: (value) => value || "-",
    },
    {
      key: "doctorName",
      title: "Doctor",
      dataIndex: "doctorName",
      render: (value) => value || "-",
    },
    {
      key: "type",
      title: "Tipo",
      dataIndex: "type",
      render: (value) => value || "-",
    },
    {
      key: "duration",
      title: "Duración",
      dataIndex: "duration",
      align: "center",
      render: (value) => (value ? `${value} min` : "-"),
    },
    {
      key: "status",
      title: "Estado",
      dataIndex: "status",
      align: "center",
      render: (value: Appointment["status"]) => {
        const config = getStatusConfig(value);
        return <StatusTag status={config.type} text={config.label} />;
      },
    },
    {
      key: "actions",
      title: "Acciones",
      align: "center",
      fixed: "right",
      width: 130,
      render: (_, record) => {
        const actions = [
          {
            key: "view",
            label: "Ver",
            icon: <EyeOutlined />,
            onClick: () => onView(record.id),
          },
          ...(onEdit
            ? [
                {
                  key: "edit",
                  label: "Editar",
                  icon: <EditOutlined />,
                  onClick: () => onEdit(record.id),
                },
              ]
            : []),
          ...(onCancel
            ? [
                {
                  key: "cancel",
                  label: "Cancelar",
                  icon: <StopOutlined />,
                  danger: true,
                  disabled: record.status === "cancelled",
                  onClick: () => onCancel(record),
                },
              ]
            : []),
        ];

        return <ActionButtons actions={actions} />;
      },
    },
  ];
}
