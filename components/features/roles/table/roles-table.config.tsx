import { Pencil } from "lucide-react";
import { DataTableColumn } from "@/components/ui/data-display/data-table";
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
      render: (value) => (
        <div className="font-medium text-ink">{value as string}</div>
      ),
    },
    {
      key: "createAt",
      title: "Fecha Creación",
      dataIndex: "createAt",
      render: (value) => (
        <span className="text-sm text-subtle tabular-nums">
          {value ? dayjs(value as string).format("DD/MM/YYYY") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Acciones",
      align: "center",
      fixed: "right",
      width: 110,
      render: (_, record) => (
        <div className="flex items-center justify-center">
          <button
            onClick={() => onEdit(record.id)}
            title="Editar rol"
            className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
}
