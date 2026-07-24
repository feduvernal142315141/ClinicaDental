import { DataTableColumn } from "@/components/ui/data-display/data-table";
import type { PaymentResponse } from "@/lib/entity/billing";
import { formatMoney } from "@/lib/utils/billing-currency";
import { PaymentMethodBadge } from "../shared/PaymentMethodBadge";
import dayjs from "dayjs";

export function getPaymentColumns(): DataTableColumn<PaymentResponse>[] {
  return [
    {
      key: "paidAt",
      title: "Fecha",
      dataIndex: "paidAt",
      width: 120,
      render: (value) => (
        <span className="text-sm text-ink">
          {value ? dayjs(value as string).format("DD/MM/YYYY") : "—"}
        </span>
      ),
    },
    {
      key: "amount",
      title: "Monto",
      dataIndex: "amount",
      align: "right",
      width: 120,
      render: (value, record) => (
        <span
          className={`text-sm font-semibold tabular-nums ${
            record.voided ? "text-subtle line-through" : "text-ink"
          }`}
        >
          {formatMoney(value as number, record.currency)}
        </span>
      ),
    },
    {
      key: "method",
      title: "Método",
      dataIndex: "method",
      width: 150,
      render: (value) => (
        <PaymentMethodBadge method={value as PaymentResponse["method"]} />
      ),
    },
    {
      key: "reference",
      title: "Referencia",
      dataIndex: "reference",
      render: (value) => (
        <span className="font-mono text-xs text-subtle">
          {(value as string) || "—"}
        </span>
      ),
    },
    {
      key: "invoiceId",
      title: "Factura",
      dataIndex: "invoiceId",
      width: 100,
      render: (value) => (
        <span className="font-mono text-xs text-subtle">
          {value ? "Asociado" : "Abono"}
        </span>
      ),
    },
  ];
}
