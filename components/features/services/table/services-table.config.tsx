import { Pencil, Ban, CheckCircle2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import { DataTableColumn } from "@/components/ui/data-display/data-table";
import { Switch } from "@/components/ui/atomic/forms";
import {
  assistantMissingInfo,
  assistantToggleBlock,
  type AssistantMissingInfo,
  type AssistantToggleBlock,
  type ServiceCategory,
  type ServiceListItem,
  type ServiceType,
} from "@/lib/entity/services";
import { cn } from "@/lib/utils/utils";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import dayjs from "dayjs";

interface GetServicesColumnsParams {
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, currentlyActive: boolean) => void;
  /** Marca/desmarca "visible en odontograma" (optimista, ver useServices). */
  onToggleOdontogram: (id: string, next: boolean) => void;
  /** Marca/desmarca "visible para el asistente" (optimista, ver useServices). */
  onToggleAssistant: (id: string, next: boolean) => void;
  canEdit: boolean;
  /** `false` deja la columna del asistente en solo lectura (sin permiso de editar). */
  canEditAssistant: boolean;
  canBlock: boolean;
  /** Ids con un PATCH de visibilidad en vuelo (switch bloqueado). */
  pendingOdontogramIds: ReadonlySet<string>;
  /** Ids con el perfil del asistente guardándose (switch bloqueado). */
  pendingAssistantIds: ReadonlySet<string>;
  /** Moneda configurada de la clínica (ISO-4217, ej. "BOB"). */
  currency: string;
  labels: {
    code: string;
    name: string;
    type: string;
    category: string;
    cost: string;
    duration: string;
    odontogramVisible: string;
    status: string;
    createdAt: string;
    actions: string;
    edit: string;
    more: string;
    activate: string;
    deactivate: string;
    active: string;
    inactive: string;
    serviceTypes: Record<ServiceType, string>;
    serviceCategories: Record<ServiceCategory, string>;
    odontogram: string;
    general: string;
    removeFromOdontogram: string;
    showInOdontogram: string;
    assistantVisible: string;
    assistantVisibleHelp: string;
    assistantOn: string;
    assistantOff: string;
    showToAssistant: string;
    hideFromAssistant: string;
    assistantBlocked: Record<AssistantToggleBlock, string>;
    assistantMissing: Record<AssistantMissingInfo, string>;
  };
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
  onToggleAssistant,
  canEdit,
  canEditAssistant,
  canBlock,
  pendingOdontogramIds,
  pendingAssistantIds,
  currency,
  labels,
}: GetServicesColumnsParams): DataTableColumn<ServiceListItem>[] {
  return [
    {
      key: "code",
      title: labels.code,
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
      title: labels.name,
      dataIndex: "name",
      sorter: true,
      render: (value) => (
        <span className="text-sm font-semibold text-ink">{value as string}</span>
      ),
    },
    {
      key: "type",
      title: labels.type,
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
            {labels.serviceTypes[type] ?? type}
          </span>
        );
      },
    },
    {
      key: "category",
      title: labels.category,
      dataIndex: "category",
      render: (value) => (
        <span className="text-sm text-ink">
          {value
            ? labels.serviceCategories[value as ServiceCategory] ?? (value as string)
            : "—"}
        </span>
      ),
    },
    {
      key: "cost",
      title: labels.cost,
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
      title: labels.duration,
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
      title: labels.odontogramVisible,
      dataIndex: "odontogramEnabled",
      align: "center",
      width: 190,
      render: (value, record) => {
        const enabled = value === true;

        if (!canEdit) {
          return enabled ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-400/25 dark:text-emerald-300">
              {labels.odontogram}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-hover px-2.5 py-0.5 text-xs font-semibold text-subtle ring-1 ring-hairline">
              {labels.general}
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
                  ? labels.removeFromOdontogram.replace("{name}", record.name)
                  : labels.showInOdontogram.replace("{name}", record.name)
              }
            />
            <span className="text-xs font-medium text-subtle">
              {enabled ? labels.odontogram : labels.general}
            </span>
          </div>
        );
      },
    },
    {
      // Lo que el asistente de WhatsApp puede mencionar. Se guarda por su propio
      // endpoint (`/assistant-profile`), nunca con el PUT del catálogo.
      key: "assistantVisible",
      title: labels.assistantVisible,
      help: labels.assistantVisibleHelp,
      dataIndex: "assistantVisible",
      align: "center",
      width: 210,
      render: (value, record) => {
        const visible = value === true;
        const blocked = assistantToggleBlock(record);
        const missing = assistantMissingInfo(record);
        const badge = (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
              visible
                ? "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25 dark:text-emerald-300"
                : "bg-hover text-subtle ring-hairline",
            )}
          >
            {visible ? labels.assistantOn : labels.assistantOff}
          </span>
        );

        return (
          <div
            className="flex flex-col items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {canEditAssistant ? (
              <div className="flex items-center justify-center gap-2">
                <Switch
                  checked={visible}
                  disabled={blocked !== null || pendingAssistantIds.has(record.id)}
                  onCheckedChange={(checked) =>
                    onToggleAssistant(record.id, checked === true)
                  }
                  aria-label={(visible
                    ? labels.hideFromAssistant
                    : labels.showToAssistant
                  ).replace("{name}", record.name)}
                />
                <span className="text-xs font-medium text-subtle">
                  {visible ? labels.assistantOn : labels.assistantOff}
                </span>
              </div>
            ) : (
              badge
            )}
            {blocked && (
              <span className="max-w-[190px] whitespace-normal text-center text-[11px] leading-tight text-subtle">
                {labels.assistantBlocked[blocked]}
              </span>
            )}
            {!blocked && missing && (
              <span className="max-w-[190px] whitespace-normal text-center text-[11px] leading-tight text-amber-700 dark:text-amber-300">
                {labels.assistantMissing[missing]}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "active",
      title: labels.status,
      dataIndex: "active",
      render: (value) =>
        value ? (
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-400/25 dark:text-emerald-300">
            {labels.active}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-hover px-2.5 py-0.5 text-xs font-semibold text-subtle ring-1 ring-hairline">
            {labels.inactive}
          </span>
        ),
    },
    {
      key: "createAt",
      title: labels.createdAt,
      dataIndex: "createAt",
      render: (value) => (
        <span className="text-sm tabular-nums text-subtle">
          {value ? dayjs(value as string).format("DD/MM/YYYY") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: labels.actions,
      align: "center",
      fixed: "right",
      width: 110,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          {canEdit && (
            <button
              onClick={() => onEdit(record.id)}
              title={labels.edit}
              className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canBlock && (
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
                    onClick={() => onToggleStatus(record.id, true)}
                  >
                    <Ban className="h-4 w-4" />
                    {labels.deactivate}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onToggleStatus(record.id, false)}>
                    <CheckCircle2 className="h-4 w-4" />
                    {labels.activate}
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
