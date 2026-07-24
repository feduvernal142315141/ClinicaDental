import { DataTableColumn } from "@/components/ui/data-display/data-table";
import type { ReceivableListItem } from "@/lib/entity/billing";
import { formatMoney } from "@/lib/utils/billing-currency";
import dayjs from "dayjs";

interface GetReceivablesColumnsParams {
  onOpenAccount: (item: ReceivableListItem) => void;
}

export function getReceivablesColumns({
  onOpenAccount,
}: GetReceivablesColumnsParams): DataTableColumn<ReceivableListItem>[] {
  return [
    {
      key: "patientName",
      title: "Paciente",
      dataIndex: "patientName",
      render: (value, record) => (
        <button
          type="button"
          onClick={() => onOpenAccount(record)}
          className="text-left text-sm font-semibold text-ink hover:text-brand hover:underline"
        >
          {(value as string) || "Paciente"}
        </button>
      ),
    },
    {
      key: "invoiceCount",
      title: "Facturas",
      dataIndex: "invoiceCount",
      width: 100,
      align: "center",
      render: (value) => (
        <span className="text-sm tabular-nums text-subtle">
          {value as number}
        </span>
      ),
    },
    {
      key: "oldestDueDate",
      title: "Vence más antigua",
      dataIndex: "oldestDueDate",
      width: 140,
      render: (value) => (
        <span className="text-sm text-ink">
          {value ? dayjs(value as string).format("DD/MM/YYYY") : "—"}
        </span>
      ),
    },
    {
      key: "balance",
      title: "Saldo",
      dataIndex: "balance",
      align: "right",
      width: 130,
      render: (value, record) => (
        <span className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
          {formatMoney(value as number, record.currency)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      width: 110,
      render: (_value, record) => (
        <button
          type="button"
          onClick={() => onOpenAccount(record)}
          className="text-xs font-medium text-brand hover:underline"
        >
          Ver cuenta
        </button>
      ),
    },
  ];
}
