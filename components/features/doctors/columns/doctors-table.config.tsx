import { DataTableColumn } from "@/components/ui/antd";
import {
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Dropdown } from "antd";
import type { DoctorListItem } from "@/lib/entity/doctors";
import dayjs from "dayjs";

interface GetDoctorsColumnsParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDeactivate: (doctor: DoctorListItem) => void;
  onActivate: (doctor: DoctorListItem) => void;
}

/** Derive initials from a full name */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Get doctors table columns configuration
 *
 * @param params - Column action handlers
 * @returns Array of DataTableColumn for doctors table
 */
export function getDoctorsColumns({
  onView,
  onEdit,
  onDeactivate,
  onActivate,
}: GetDoctorsColumnsParams): DataTableColumn<DoctorListItem>[] {
  return [
    {
      key: "name",
      title: "Doctor",
      dataIndex: "name",
      sorter: true,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          {/* Initials avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-400">
            {getInitials(record.name)}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {record.name}
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
              {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "licenceNumber",
      title: "Licencia",
      dataIndex: "licenceNumber",
      render: (value) => (
        <span className="font-mono text-xs text-slate-600">{value || "-"}</span>
      ),
    },
    {
      key: "phone",
      title: "Teléfono",
      dataIndex: "phone",
      render: (value) => (
        <span className="text-sm text-slate-600">{value || "-"}</span>
      ),
    },
    {
      key: "role",
      title: "Rol",
      dataIndex: ["role", "name"],
      render: (_, record) => (
        <span className="text-sm text-slate-600">{record.role?.name || "-"}</span>
      ),
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
      width: 120,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onView(record.id)}
            title="Ver Doctor"
            className="btn-action-view"
          >
            <EyeOutlined className="text-sm" />
          </button>
          <button
            onClick={() => onEdit(record.id)}
            title="Editar Doctor"
            className="btn-action-edit"
          >
            <EditOutlined className="text-sm" />
          </button>
          <Dropdown
            menu={{
              items: [
                record.active
                  ? {
                      key: "deactivate",
                      label: "Desactivar",
                      icon: <StopOutlined />,
                      danger: true,
                      onClick: () => onDeactivate(record),
                    }
                  : {
                      key: "activate",
                      label: "Activar",
                      icon: <CheckCircleOutlined />,
                      className: "menu-item-success",
                      onClick: () => onActivate(record),
                    },
              ],
            }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <button title="Más acciones" className="btn-action-more">
              <MoreOutlined className="text-sm" />
            </button>
          </Dropdown>
        </div>
      ),
    },
  ];
}
