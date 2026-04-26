import { DataTableColumn } from "@/components/ui/antd";
import {
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Dropdown, Tag } from "antd";
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
      render: (value) => (
        <span className="font-mono text-xs text-slate-600">{value}</span>
      ),
    },
    {
      key: "name",
      title: "Nombre",
      dataIndex: "name",
      sorter: true,
      render: (value) => (
        <div className="text-sm font-bold text-slate-900">{value}</div>
      ),
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
      render: (value: number) => (
        <span className="text-sm text-slate-600">
          {typeof value === "number" ? `$${value.toFixed(2)}` : "-"}
        </span>
      ),
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
      render: (value: boolean) =>
        value ? (
          <span className="rounded-full border border-green-100 bg-green-50 px-2.5 py-0.5 text-[11px] font-bold text-green-700">
            Activo
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
            Inactivo
          </span>
        ),
    },
    {
      key: "createAt",
      title: "Fecha Creación",
      dataIndex: "createAt",
      render: (value) => (
        <span className="text-sm text-slate-600">
          {value ? dayjs(value).format("DD/MM/YYYY") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "ACCIONES",
      align: "center",
      fixed: "right",
      width: 100,
      render: (_, record) => {
        const dropdownItems = [];

        if (canBlock) {
          if (record.active) {
            dropdownItems.push({
              key: "deactivate",
              label: "Desactivar",
              icon: <StopOutlined />,
              danger: true,
              onClick: () => onToggleStatus(record.id, true),
            });
          } else {
            dropdownItems.push({
              key: "activate",
              label: "Activar",
              icon: <CheckCircleOutlined />,
              className: "menu-item-success",
              onClick: () => onToggleStatus(record.id, false),
            });
          }
        }

        return (
          <div className="flex items-center justify-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(record.id)}
                title="Editar Servicio"
                className="btn-action-edit"
              >
                <EditOutlined className="text-sm" />
              </button>
            )}
            {canBlock && dropdownItems.length > 0 && (
              <Dropdown
                menu={{ items: dropdownItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <button title="Más acciones" className="btn-action-more">
                  <MoreOutlined className="text-sm" />
                </button>
              </Dropdown>
            )}
          </div>
        );
      },
    },
  ];
}
