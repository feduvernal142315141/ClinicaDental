import { DataTableColumn } from "@/components/ui/data-display/data-table";
import { Eye, Pencil, Ban, CheckCircle2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import type { Patient } from "@/lib/entity/patients";
import { calculateAge } from "@/lib/entity/patients";
import { ActiveBadge } from "@/components/ui/atomic/data-display/status-badge";

interface GetPatientsColumnsParams {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  /** Called when the user requests to deactivate an active patient */
  onDelete: (patient: Patient) => void;
  /** Called when the user requests to activate an inactive patient */
  onToggleStatus: (patient: Patient) => void;
  /** When false, the edit action button is hidden */
  canEdit?: boolean;
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
 * @param params - Column action handlers and permission flags
 * @returns Array of DataTableColumn for patients table
 */
export function getPatientsColumns({
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  canEdit = true,
}: GetPatientsColumnsParams): DataTableColumn<Patient>[] {
  return [
    {
      key: "name",
      title: "Paciente",
      dataIndex: "name",
      sorter: true,
      render: (_value: unknown, record) => (
        <div className="flex items-center gap-3">
          {/* Avatar con iniciales */}
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-hover text-sm font-bold text-subtle"
          >
            {getInitials(record.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink truncate">
              {record.name}
            </div>
            <div className="font-mono text-[11px] text-subtle truncate max-w-[140px]">
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
      render: (value: unknown) => {
        if (!value) return <span className="text-sm text-ink">-</span>;
        const age = calculateAge(value as string);
        return (
          <span className="text-sm text-ink">
            {age.years} años y {age.months} meses
          </span>
        );
      },
    },
    {
      key: "contact",
      title: "Contacto",
      render: (_value: unknown, record) => (
        <div>
          <div className="text-[13px] font-medium text-ink">
            {record.email || "-"}
          </div>
          {record.phone ? (
            <a
              href={`https://wa.me/${record.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-subtle hover:text-green-600 transition-colors"
            >
              {record.phone}
            </a>
          ) : (
            <span className="text-[11px] text-subtle">-</span>
          )}
        </div>
      ),
    },
    {
      key: "address",
      title: "Dirección",
      dataIndex: "address",
      render: (value: unknown) => (
        <span className="block max-w-[200px] truncate text-[13px] text-subtle">
          {(value as string) || "-"}
        </span>
      ),
    },
    {
      key: "active",
      title: "Estado",
      dataIndex: "active",
      render: (value: unknown) => <ActiveBadge active={Boolean(value)} />,
    },
    {
      key: "actions",
      title: "Acciones",
      align: "center",
      fixed: "right",
      width: 120,
      render: (_value: unknown, record) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onView(record.id)}
            aria-label={`Ver historial de ${record.name}`}
            title="Ver historial"
            className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-brand"
          >
            <Eye className="h-4 w-4" />
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(record.id)}
              aria-label={`Editar paciente ${record.name}`}
              title="Editar paciente"
              className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Más acciones para ${record.name}`}
                  title="Más acciones"
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {record.active ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(record)}
                  >
                    <Ban className="h-4 w-4" />
                    Desactivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onToggleStatus(record)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Activar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ];
}
