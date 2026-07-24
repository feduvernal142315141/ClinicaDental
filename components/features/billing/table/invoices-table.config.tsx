import { DataTableColumn } from "@/components/ui/data-display/data-table";
import type { InvoiceResponse } from "@/lib/entity/billing";
import { formatMoney } from "@/lib/utils/billing-currency";
import { InvoiceStatusBadge } from "../shared/InvoiceStatusBadge";
import dayjs from "dayjs";

interface GetInvoiceColumnsParams {
  onSelect?: (invoice: InvoiceResponse) => void;
}

export function getInvoiceColumns({
  onSelect,
}: GetInvoiceColumnsParams = {}): DataTableColumn<InvoiceResponse>[] {
  return [
    {
      key: "code",
      title: "Código",
      dataIndex: "code",
      width: 110,
      render: (value) => (
        <span className="font-mono text-xs text-subtle">{value as string}</span>
      ),
    },
    {
      key: "issuedAt",
      title: "Fecha",
      dataIndex: "issuedAt",
      width: 110,
      render: (value) => (
        <span className="text-sm text-ink">
          {value ? dayjs(value as string).format("DD/MM/YYYY") : "—"}
        </span>
      ),
    },
    {
      key: "total",
      title: "Total",
      dataIndex: "total",
      align: "right",
      width: 110,
      render: (value, record) => (
        <span className="text-sm font-semibold tabular-nums text-ink">
          {formatMoney(value as number, record.currency)}
        </span>
      ),
    },
    {
      key: "balance",
      title: "Saldo",
      dataIndex: "balance",
      align: "right",
      width: 110,
      render: (value, record) => {
        const balance = value as number;
        return (
          <span
            className={`text-sm font-semibold tabular-nums ${
              balance > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {formatMoney(balance, record.currency)}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "Estado",
      dataIndex: "status",
      width: 130,
      render: (value) => (
        <InvoiceStatusBadge status={value as InvoiceResponse["status"]} />
      ),
    },
    ...(onSelect
      ? [
          {
            key: "actions",
            title: "",
            width: 80,
            render: (_: unknown, record: InvoiceResponse) => (
              <button
                type="button"
                onClick={() => onSelect(record)}
                className="text-xs font-medium text-brand hover:underline"
              >
                Ver
              </button>
            ),
          } satisfies DataTableColumn<InvoiceResponse>,
        ]
      : []),
  ];
}
