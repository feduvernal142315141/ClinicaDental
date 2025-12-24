import {
  DataTableColumn,
  StatusTag,
  ActionButtons,
} from "@/components/ui/antd";
import { EyeOutlined, EditOutlined } from "@ant-design/icons";
import type { DoctorListItem } from "@/lib/entity/doctors";
import dayjs from "dayjs";

interface GetDoctorsColumnsParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
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
}: GetDoctorsColumnsParams): DataTableColumn<DoctorListItem>[] {
  return [
    {
      key: "name",
      title: "Nombre",
      dataIndex: "name",
      sorter: true,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      key: "licenceNumber",
      title: "Licencia",
      dataIndex: "licenceNumber",
    },
    {
      key: "phone",
      title: "Teléfono",
      dataIndex: "phone",
      render: (value) => value || "-",
    },
    {
      key: "role",
      title: "Rol",
      dataIndex: ["role", "name"],
      render: (_, record) => record.role?.name || "-",
    },
    {
      key: "active",
      title: "Estado",
      dataIndex: "active",
      align: "center",
      render: (value) => (
        <StatusTag
          status={value ? "success" : "error"}
          text={value ? "Activo" : "Inactivo"}
        />
      ),
    },
    {
      key: "createAt",
      title: "Fecha Creación",
      dataIndex: "createAt",
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      key: "actions",
      title: "Acciones",
      align: "center",
      fixed: "right",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          actions={[
            {
              key: "view",
              label: "Ver",
              icon: <EyeOutlined />,
              onClick: () => onView(record.id),
            },
            {
              key: "edit",
              label: "Editar",
              icon: <EditOutlined />,
              onClick: () => onEdit(record.id),
            },
          ]}
        />
      ),
    },
  ];
}
