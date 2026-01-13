import { ActionButtons, DataTableColumn } from "@/components/ui/antd";
import { EditOutlined } from "@ant-design/icons";
import type { RoleListItem } from "@/lib/entity/roles";
import dayjs from "dayjs";

interface GetRolesColumnsParams {
  onEdit: (id: string) => void;
}

export function getRolesColumns({
  onEdit,
}: GetRolesColumnsParams): DataTableColumn<RoleListItem>[] {
  return [
    {
      key: "name",
      title: "Nombre",
      dataIndex: "name",
      sorter: true,
      render: (value) => <div className="font-medium">{value}</div>,
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
      width: 110,
      render: (_, record) => (
        <ActionButtons
          actions={[
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
