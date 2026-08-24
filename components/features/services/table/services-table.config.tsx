import { Pencil, Ban, CheckCircle2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import { DataTableColumn } from "@/components/ui/data-display/data-table";
import { Switch } from "@/components/ui/atomic/forms";
import type { ServiceListItem, ServiceType } from "@/lib/entity/services";
import {
  SERVICE_TYPE_LABELS,
  SERVICE_CATEGORY_LABELS,
} from "@/lib/entity/services";
import { cn } from "@/lib/utils/utils";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import dayjs from "dayjs";

interface GetServicesColumnsParams {
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, currentlyActive: boolean) => void;
  /** Marca/desmarca "visible en odontograma" (optimista, ver useServices). */
  onToggleOdontogram: (id: string, next: boolean) => void;
  canEdit: boolean;
  canBlock: boolean;
  /** Ids con un PATCH de visibilidad en vuelo (switch bloqueado). */
  pendingOdontogramIds: ReadonlySet<string>;
  /** Moneda configurada de la clínica (ISO-4217, ej. "BOB"). */
  currency: string;
}

const TYPE_BADGE: Record<ServiceType, string> = {
  TREATMENT: "bg-brand/10 text-brand ring-brand/20",
  PROCEDURE: "bg-emerald-500/15 text-emerald-600 ring-emerald-400/25 dark:text-emerald-300",
  PRODUCT: "bg-amber-500/15 text-amber-600 ring-amber-400/25 dark:text-amber-300",
  ADVANCE: "bg-violet-500/15 text-violet-600 ring-violet-400/25 dark:text-violet-300",
};

export function getServicesColumns({
  onEdit,
  onToggleStatus,
  onToggleOdontogram,
  canEdit,
  canBlock,
  pendingOdontogramIds,
  currency,
}: GetServicesColumnsParams): DataTableColumn<ServiceListItem>[] {
  return [
    {
      key: "code",
      title: "Código",
      dataIndex: "code",
      sorter: true,
      width: 110,
      render: (value) => (
        <span className="font-mono text-xs text-subtle">
          {(value as string) || "-"}
        </span>
      ),
    },
    {
      key: "name",
      title: "Nombre",
      dataIndex: "name",
      sorter: true,
      render: (value) => (
        <span className="text-sm font-semibold text-ink">{value as string}</span>
      ),
    },
    {
      key: "type",
      title: "Tipo",
      dataIndex: "type",
      render: (value) => {
        const type = value as ServiceType;
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
              TYPE_BADGE[type] ?? "bg-hover text-subtle ring-hairline",
            )}
          >
            {SERVICE_TYPE_LABELS[type] ?? type}
          </span>
        );
      },
    },
    {
      key: "category",
      title: "Categoría",
      dataIndex: "category",
      render: (value) => (
        <span className="text-sm text-ink">
          {value
            ? SERVICE_CATEGORY_LABELS[
                value as keyof typeof SERVICE_CATEGORY_LABELS
              ] ?? (value as string)
            : "—"}
        </span>
      ),
    },
    {
      key: "cost",
      title: "Costo",
      dataIndex: "cost",
      align: "right",
      render: (value) => (
        <span className="text-sm tabular-nums text-ink">
          {typeof value === "number"
            ? formatClinicCurrencyExact(value, currency)
            : "-"}
        </span>
      ),
    },
    {
      key: "duration",
      title: "Duración",
      dataIndex: "duration",
      align: "right",
      render: (value) => (
        <span className="text-sm tabular-nums text-subtle">
          {typeof value === "number" && value > 0 ? `${value} min` : "—"}
        </span>
      ),
    },
    {
      // `odontogramEnabled` decide DÓNDE se planifica el servicio: activado se
      // planifica diente a diente en el odontograma; desactivado es un servicio
      // "general" (limpieza, radiografía, consulta) que se planifica a nivel
      // paciente. Por eso se puede conmutar desde la propia lista.
      key: "odontogramEnabled",
      title: "Visible en odontograma",
      dataIndex: "odontogramEnabled",
      align: "center",
      width: 190,
      render: (value, record) => {
        const enabled = value === true;

        if (!canEdit) {
          return enabled ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-400/25 dark:text-emerald-300">
              Odontograma
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-hover px-2.5 py-0.5 text-xs font-semibold text-subtle ring-1 ring-hairline">
              General
            </span>
          );
        }

        return (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={enabled}
              disabled={pendingOdontogramIds.has(record.id)}
              onCheckedChange={(checked) =>
                onToggleOdontogram(record.id, checked === true)
              }
              aria-label={
                enabled
                  ? `Quitar "${record.name}" del odontograma (pasa a servicio general)`
                  : `Mostrar "${record.name}" en el odontograma`
              }
            />
            <span className="text-xs font-medium text-subtle">
              {enabled ? "Odontograma" : "General"}
            </span>
          </div>
        );
      },
    },
    {
      key: "active",
      title: "Estado",
      dataIndex: "active",
      render: (value) =>
        value ? (
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-400/25 dark:text-emerald-300">
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-hover px-2.5 py-0.5 text-xs font-semibold text-subtle ring-1 ring-hairline">
            Inactivo
          </span>
        ),
    },
    {
      key: "createAt",
      title: "Fecha Creación",
      dataIndex: "createAt",
      render: (value) => (
        <span className="text-sm tabular-nums text-subtle">
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
        <div className="flex items-center justify-center gap-1">
          {canEdit && (
            <button
              onClick={() => onEdit(record.id)}
              title="Editar servicio"
              className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canBlock && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
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
                    onClick={() => onToggleStatus(record.id, true)}
                  >
                    <Ban className="h-4 w-4" />
                    Desactivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onToggleStatus(record.id, false)}>
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
