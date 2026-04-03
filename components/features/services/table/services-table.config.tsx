import { ActionButtons, DataTableColumn } from "@/components/ui/antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Tag } from "antd";
import type { ServiceListItem } from "@/lib/entity/services";
import { SERVICE_TYPE_LABELS } from "@/lib/entity/services";
import dayjs from "dayjs";

interface GetServicesColumnsParams {
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, currentlyActive: boolean) => void;
  canEdit: boolean;
  canBlock: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  TREATMENT: "blue",
  PROCEDURE: "green",
  PRODUCT: "orange",
  ADVANCE: "purple",
};

export function getServicesColumns({
  onEdit,
  onToggleStatus,
  canEdit,
  canBlock,
}: GetServicesColumnsParams): DataTableColumn<ServiceListItem>[] {
  return [
    {
      key: "code",
      title: "Código",
      dataIndex: "code",
      sorter: true,
      width: 120,
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: "name",
      title: "Nombre",
      dataIndex: "name",
      sorter: true,
      render: (value) => <div className="font-medium">{value}</div>,
    },
    {
      key: "type",
      title: "Tipo",
      dataIndex: "type",
      render: (value: string) => (
        <Tag color={TYPE_COLORS[value] ?? "default"}>
          {SERVICE_TYPE_LABELS[value as keyof typeof SERVICE_TYPE_LABELS] ??
            value}
        </Tag>
      ),
    },
    {
      key: "cost",
      title: "Costo",
      dataIndex: "cost",
      align: "right",
      render: (value: number) =>
        typeof value === "number" ? `$${value.toFixed(2)}` : "-",
    },
    {
      key: "odontogramEnabled",
      title: "Odontograma",
      dataIndex: "odontogramEnabled",
      align: "center",
      render: (value: boolean) =>
        value ? <Tag color="success">Sí</Tag> : <Tag color="default">No</Tag>,
    },
    {
      key: "active",
      title: "Estado",
      dataIndex: "active",
      align: "center",
      render: (value: boolean) =>
        value ? (
          <Tag color="success">Activo</Tag>
        ) : (
          <Tag color="error">Inactivo</Tag>
        ),
    },
    {
      key: "createAt",
      title: "Fecha Creación",
      dataIndex: "createAt",
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      key: "actions",
      title: "Acciones",
      align: "center",
      fixed: "right",
      width: 130,
      render: (_, record) => {
        const actions = [];

        if (canEdit) {
          actions.push({
            key: "edit",
            label: "Editar",
            icon: <EditOutlined />,
            onClick: () => onEdit(record.id),
          });
        }

        if (canBlock && record.active) {
          actions.push({
            key: "inactivate",
            label: "Desactivar",
            icon: <StopOutlined />,
            danger: true,
            onClick: () => onToggleStatus(record.id, true),
          });
        }

        if (canBlock && !record.active) {
          actions.push({
            key: "activate",
            label: "Activar",
            icon: <CheckCircleOutlined />,
            success: true,
            onClick: () => onToggleStatus(record.id, false),
          });
        }

        return <ActionButtons actions={actions} />;
      },
    },
  ];
}
