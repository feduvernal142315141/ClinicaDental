import { DataTableColumn } from "@/components/ui/data-display/data-table";
import {
  Eye,
  Pencil,
  Ban,
  CheckCircle2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import type { DoctorListItem } from "@/lib/entity/doctors";
import {
  ActiveBadge,
  StatusBadge,
} from "@/components/ui/atomic/data-display/status-badge";
import dayjs from "dayjs";

interface GetDoctorsColumnsParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDeactivate?: (doctor: DoctorListItem) => void;
  onActivate?: (doctor: DoctorListItem) => void;
  labels: {
    user: string;
    license: string;
    phone: string;
    role: string;
    type: string;
    status: string;
    createdAt: string;
    actions: string;
    view: string;
    edit: string;
    more: string;
    activate: string;
    deactivate: string;
    active: string;
    inactive: string;
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function getDoctorsColumns({
  onView,
  onEdit,
  onDeactivate,
  onActivate,
  labels,
}: GetDoctorsColumnsParams): DataTableColumn<DoctorListItem>[] {
  return [
    {
      key: "name",
      title: labels.user,
      dataIndex: "name",
      sorter: true,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline bg-hover text-xs font-semibold text-subtle">
            {getInitials(record.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">
              {record.name}
            </div>
            <div className="truncate text-xs text-subtle">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "licenceNumber",
      title: labels.license,
      dataIndex: "licenceNumber",
      render: (value) => (
        <span className="font-mono text-xs text-subtle">
          {(value as string) || "-"}
        </span>
      ),
    },
    {
      key: "phone",
      title: labels.phone,
      dataIndex: "phone",
      render: (value) => (
        <span className="text-sm text-ink tabular-nums">
          {(value as string) || "-"}
        </span>
      ),
    },
    {
      key: "role",
      title: labels.role,
      dataIndex: ["role", "name"],
      render: (_, record) => (
        <span className="text-sm text-ink">{record.role?.name || "-"}</span>
      ),
    },
    {
      key: "userType",
      title: labels.type,
      dataIndex: "userType",
      render: (_, record) => {
        const userType = record.userType;
        if (!userType?.name) {
          return <span className="text-sm text-subtle">-</span>;
        }
        return (
          <StatusBadge tone={userType.attendsAppointments ? "info" : "neutral"}>
            {userType.name}
          </StatusBadge>
        );
      },
    },
    {
      key: "active",
      title: labels.status,
      dataIndex: "active",
      render: (value) => (
        <ActiveBadge
          active={Boolean(value)}
          activeLabel={labels.active}
          inactiveLabel={labels.inactive}
        />
      ),
    },
    {
      key: "createAt",
      title: labels.createdAt,
      dataIndex: "createAt",
      render: (value) => (
        <span className="text-sm text-subtle tabular-nums">
          {value ? dayjs(value as string).format("DD/MM/YYYY") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: labels.actions,
      align: "center",
      width: 120,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onView(record.id)}
            title={labels.view}
            className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-brand"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(record.id)}
            title={labels.edit}
            className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title={labels.more}
                className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {record.active ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeactivate?.(record)}
                >
                  <Ban className="h-4 w-4" />
                  {labels.deactivate}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onActivate?.(record)}>
                  <CheckCircle2 className="h-4 w-4" />
                  {labels.activate}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
