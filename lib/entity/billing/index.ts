/**
 * Billing Entity Types
 *
 * Contratos tipados para Facturación y Cobros.
 * Fuente de verdad compartida entre hooks, services y (eventualmente) backend.
 *
 * Modelo:
 * - Estimate (presupuesto) → se convierte en Invoice al aceptarse
 * - Invoice (factura/cargo) → recibe Payments
 * - PatientLedger → resumen de cuenta del paciente
 *
 * Sin pasarela: los pagos se registran (efectivo / POS / transferencia).
 */

// ─── Enums / unions ─────────────────────────────────────────────────

export type EstimateStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export type InvoiceStatus =
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID";

export type PaymentMethod =
  | "CASH"
  | "CARD_POS"
  | "TRANSFER"
  | "ADVANCE"
  | "OTHER";

// ─── Shared line item ───────────────────────────────────────────────

export interface BillingLineItem {
  id: string;
  serviceId?: string;
  description: string;
  /** Referencia dental FDI opcional (ej. "16") */
  toothRef?: string;
  quantity: number;
  unitPrice: number;
  /** Descuento en monto (misma moneda del documento) */
  discount: number;
  /** quantity * unitPrice - discount */
  total: number;
}

export type BillingLineItemInput = Omit<BillingLineItem, "id" | "total">;

// ─── Estimate (Presupuesto) ─────────────────────────────────────────

export interface EstimateResponse {
  id: string;
  clinicId?: string;
  patientId: string;
  /** Correlativo legible, ej. P-000123 */
  code: string;
  status: EstimateStatus;
  treatmentPlanId?: string;
  items: BillingLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  /** ISO-4217 */
  currency: string;
  /**
   * Tipo de cambio congelado al emitir el documento
   * (documentoCurrency / clinicBaseCurrency). 1 = misma moneda.
   */
  exchangeRate?: number;
  /** YYYY-MM-DD */
  validUntil?: string;
  /** Set al convertir a factura */
  invoiceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEstimateRequest {
  patientId: string;
  treatmentPlanId?: string;
  items: BillingLineItemInput[];
  discount?: number;
  currency: string;
  exchangeRate?: number;
  /** YYYY-MM-DD */
  validUntil?: string;
  notes?: string;
  status?: Extract<EstimateStatus, "DRAFT" | "SENT">;
}

export interface UpdateEstimateRequest {
  id: string;
  items?: BillingLineItemInput[];
  discount?: number;
  currency?: string;
  exchangeRate?: number;
  validUntil?: string;
  notes?: string;
}

export interface UpdateEstimateStatusRequest {
  status: Extract<
    EstimateStatus,
    "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"
  >;
}

/** Resultado de POST /billing/estimates/{id}/convert */
export interface ConvertEstimateResult {
  estimate: EstimateResponse;
  invoice: InvoiceResponse;
}

// ─── Invoice (Factura / Cargo) ───────────────────────────────────────

export interface InvoiceResponse {
  id: string;
  clinicId?: string;
  patientId: string;
  /** Correlativo legible, ej. F-000123 */
  code: string;
  status: InvoiceStatus;
  estimateId?: string;
  treatmentPlanId?: string;
  items: BillingLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  /** total - paidAmount */
  balance: number;
  currency: string;
  exchangeRate?: number;
  notes?: string;
  issuedAt?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  patientId: string;
  estimateId?: string;
  treatmentPlanId?: string;
  items: BillingLineItemInput[];
  discount?: number;
  currency: string;
  exchangeRate?: number;
  notes?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
}

export interface UpdateInvoiceRequest {
  id: string;
  items?: BillingLineItemInput[];
  discount?: number;
  notes?: string;
  dueDate?: string;
}

// ─── Payment ────────────────────────────────────────────────────────

export interface PaymentResponse {
  id: string;
  patientId: string;
  /** null/undefined = abono a cuenta / anticipo sin factura */
  invoiceId?: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  method: PaymentMethod;
  /** # voucher POS, # transferencia, etc. */
  reference?: string;
  paidAt: string;
  receivedBy?: string;
  notes?: string;
  voided?: boolean;
  createdAt: string;
}

export interface RegisterPaymentRequest {
  patientId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  method: PaymentMethod;
  reference?: string;
  /** ISO; default: ahora */
  paidAt?: string;
  notes?: string;
}

// ─── Patient ledger ─────────────────────────────────────────────────

export interface PatientLedgerResponse {
  patientId: string;
  /** Moneda base de la clínica (para totales agregados) */
  currency: string;
  totalCharged: number;
  totalPaid: number;
  /** > 0 debe; < 0 saldo a favor */
  balance: number;
  /** Anticipos sin aplicar */
  creditBalance: number;
  estimates: EstimateResponse[];
  invoices: InvoiceResponse[];
  payments: PaymentResponse[];
}

// ─── Cash summary (Fase 2) ──────────────────────────────────────────

export interface CashSummaryResponse {
  /** YYYY-MM-DD */
  date: string;
  currency: string;
  collectedTotal: number;
  byMethod: Partial<Record<PaymentMethod, number>>;
  pendingTotal: number;
  patientsWithBalance: number;
}

export interface ReceivableListItem {
  patientId: string;
  patientName: string;
  balance: number;
  currency: string;
  oldestDueDate?: string;
  invoiceCount: number;
}

// ─── Exchange rates ─────────────────────────────────────────────────

export interface ExchangeRateResponse {
  base: string;
  target: string;
  rate: number;
  asOf: string;
}

// ─── Query / pagination ─────────────────────────────────────────────

export interface BillingPagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface BillingQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
  patientId?: string;
  status?: string;
  q?: string;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
}

export interface PaginatedEstimatesResponse {
  entities: EstimateResponse[];
  pagination: BillingPagination;
}

export interface PaginatedInvoicesResponse {
  entities: InvoiceResponse[];
  pagination: BillingPagination;
}

export interface PaginatedPaymentsResponse {
  entities: PaymentResponse[];
  pagination: BillingPagination;
}

export interface PaginatedReceivablesResponse {
  entities: ReceivableListItem[];
  pagination: BillingPagination;
}

// ─── UI labels (español) ────────────────────────────────────────────

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
  CONVERTED: "Convertido",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  ISSUED: "Emitida",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagada",
  VOID: "Anulada",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD_POS: "Tarjeta (POS)",
  TRANSFER: "Transferencia",
  ADVANCE: "Saldo a favor",
  OTHER: "Otro",
};
