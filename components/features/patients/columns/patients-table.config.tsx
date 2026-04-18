import { DataTableColumn, ActionButtons } from "@/components/ui/antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Patient } from "@/lib/entity/patients";
import { calculateAge } from "@/lib/entity/patients";
import dayjs from "dayjs";

interface GetPatientsColumnsParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (patient: Patient) => void;
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
}: GetPatientsColumnsParams): DataTableColumn<Patient>[] {
  return [
    {
      key: "name",
      title: "Nombre",
      dataIndex: "name",
      sorter: true,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <div className="text-sm text-gray-500">ID: {record.id}</div>
        </div>
      ),
    },
    {
      key: "age",
      title: "Edad",
      dataIndex: "dateOfBirth",
      render: (value) => {
        if (!value) return "-";
        const age = calculateAge(value);
        return `${age.years} años y ${age.months} meses`;
      },
    },
    {
      key: "email",
      title: "Email",
      dataIndex: "email",
      render: (value) => value || "-",
    },
    {
      key: "phone",
      title: "Teléfono",
      dataIndex: "phone",
      render: (value: string | undefined) => {
        if (!value) return "-";
        const clean = value.replace(/\D/g, "");
        return (
          <a
            href={`https://wa.me/${clean}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ whiteSpace: "nowrap" }}
          >
            {value}
          </a>
        );
      },
    },
    {
      key: "address",
      title: "Dirección",
      dataIndex: "address",
      render: (value) => value || "-",
    },
    {
      key: "createAt",
      title: "Fecha Registro",
      dataIndex: "createAt",
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      key: "actions",
      title: "Acciones",
      align: "center",
      fixed: "right",
      width: 150,
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
            {
              key: "delete",
              label: "Eliminar",
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => onDelete(record),
            },
          ]}
        />
      ),
    },
  ];
}
