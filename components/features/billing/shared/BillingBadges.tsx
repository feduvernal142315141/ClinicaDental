import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import {
  CHARGE_STATUS_LABELS,
  ESTIMATE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type ChargeStatus,
  type EstimateStatus,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentResponse,
} from "@/lib/entity/billing";

const ESTIMATE_TONE: Record<EstimateStatus, StatusBadgeTone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
  CONVERTED: "progress",
};

const INVOICE_TONE: Record<InvoiceStatus, StatusBadgeTone> = {
  ISSUED: "warning",
  PARTIALLY_PAID: "progress",
  PAID: "success",
  VOID: "neutral",
};

const CHARGE_TONE: Record<ChargeStatus, StatusBadgeTone> = {
  PENDING: "warning",
  BILLED: "success",
  DISMISSED: "neutral",
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  return <StatusBadge tone={ESTIMATE_TONE[status]}>{ESTIMATE_STATUS_LABELS[status]}</StatusBadge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge tone={INVOICE_TONE[status]}>{INVOICE_STATUS_LABELS[status]}</StatusBadge>;
}

export function ChargeStatusBadge({ status }: { status: ChargeStatus }) {
  return <StatusBadge tone={CHARGE_TONE[status]}>{CHARGE_STATUS_LABELS[status]}</StatusBadge>;
}

export function PaymentMethodLabel({ method }: { method: PaymentMethod }) {
  return <span>{PAYMENT_METHOD_LABELS[method]}</span>;
}

/** Estado derivado de un pago: anulado, devuelto parcial o total. */
export function PaymentStateBadge({ payment }: { payment: PaymentResponse }) {
  if (payment.voided) return <StatusBadge tone="neutral">Anulado</StatusBadge>;
  if (payment.refundedAmount <= 0) return <StatusBadge tone="success">Vigente</StatusBadge>;
  if (payment.refundedAmount + 0.005 >= payment.amount) {
    return <StatusBadge tone="danger">Devuelto total</StatusBadge>;
  }
  return <StatusBadge tone="warning">Devuelto parcial</StatusBadge>;
}
