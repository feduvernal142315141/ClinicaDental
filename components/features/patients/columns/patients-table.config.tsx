import { DataTableColumn } from "@/components/ui/antd";
import {
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Dropdown } from "antd";
import type { Patient } from "@/lib/entity/patients";
import { calculateAge } from "@/lib/entity/patients";

interface GetPatientsColumnsParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (patient: Patient) => void;
  onToggleStatus: (patient: Patient) => void;
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
 * Get patients table columns configuration
 *
 * @param params - Column action handlers
 * @returns Array of DataTableColumn for patients table
 */
export function getPatientsColumns({
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: GetPatientsColumnsParams): DataTableColumn<Patient>[] {
  return [
    {
      key: "name",
      title: "Paciente",
      dataIndex: "name",
      sorter: true,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          {/* Avatar with initials */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-400">
            {getInitials(record.name)}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {record.name}
            </div>
            <div className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
              {record.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "age",
      title: "Edad",
      dataIndex: "dateOfBirth",
      render: (value) => {
        if (!value) return <span className="text-sm text-slate-600">-</span>;
        const age = calculateAge(value);
        return (
          <span className="text-sm text-slate-600">
            {age.years} años y {age.months} meses
          </span>
        );
      },
    },
    {
      key: "contact",
      title: "Contacto",
      render: (_, record) => (
        <div>
          <div className="text-[13px] font-medium text-slate-900">
            {record.email || "-"}
          </div>
          {record.phone ? (
            <a
              href={`https://wa.me/${record.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-green-600 transition-colors"
            >
              {record.phone}
            </a>
          ) : (
            <span className="text-[11px] text-slate-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: "address",
      title: "Dirección",
      dataIndex: "address",
      render: (value) => (
        <span className="block max-w-[200px] truncate text-[13px] text-slate-500">
          {value || "-"}
        </span>
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
      key: "actions",
      title: "ACCIONES",
      align: "center",
      fixed: "right",
      width: 120,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onView(record.id)}
            title="Ver Historial"
            className="btn-action-view"
          >
            <EyeOutlined className="text-sm" />
          </button>
          <button
            onClick={() => onEdit(record.id)}
            title="Editar Paciente"
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
                      onClick: () => onDelete(record),
                    }
                  : {
                      key: "activate",
                      label: "Activar",
                      icon: <CheckCircleOutlined />,
                      className: "menu-item-success",
                      onClick: () => onToggleStatus(record),
                    },
              ],
            }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <button
              title="Más acciones"
              className="btn-action-more"
            >
              <MoreOutlined className="text-sm" />
            </button>
          </Dropdown>
        </div>
      ),
    },
  ];
}
