/**
 * Billing (Finanzas) — contrato tipado.
 *
 * Fuente: backend-clinic, rama `feature/finance-module` (docs/finance/frontend-prompt.md §5).
 * El backend es la fuente de verdad del dinero: la UI muestra vistas previas, pero siempre
 * pinta los totales, saldos y estados que devuelve la API.
 *
 * "Invoice" en la API = "Recibo" en la UI (documento no fiscal, `documentType: "RECEIPT"`).
 */

// ─── Enums / unions ─────────────────────────────────────────────────

export type EstimateStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export type InvoiceStatus = "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export type PaymentMethod = "CASH" | "CARD_POS" | "TRANSFER" | "ADVANCE" | "OTHER";

export type RefundMethod = Exclude<PaymentMethod, "ADVANCE">;

export type ChargeStatus = "PENDING" | "BILLED" | "DISMISSED";

export type ChargeSource = "APPOINTMENT" | "MANUAL";

export type ChargePolicy = "OFF" | "SUGGEST" | "AUTO";

export type CashSessionStatus = "OPEN" | "CLOSED";

/** Estados a los que se puede mover un presupuesto con PATCH /status. */
export type EstimateStatusChange = Extract<
  EstimateStatus,
  "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"
>;

// ─── Paginación ─────────────────────────────────────────────────────

export interface BillingPagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  entities: T[];
  pagination: BillingPagination;
}

// ─── Líneas ─────────────────────────────────────────────────────────

export interface BillingLineItem {
  id: string;
  serviceId?: string | null;
  serviceCode?: string | null;
  description: string;
  toothRef?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  /** Presente cuando la línea viene de un cargo: no se edita. */
  chargeId?: string | null;
}

export interface BillingLineItemInput {
  serviceId?: string;
  description: string;
  toothRef?: string;
  quantity: number;
  unitPrice: number;
  /** Máximo 2 decimales. */
  discount?: number;
}

// ─── Presupuestos ───────────────────────────────────────────────────

export interface EstimateResponse {
  id: string;
  clinicId: string;
  patientId: string;
  patientName?: string | null;
  /** P-000001 */
  code: string;
  status: EstimateStatus;
  treatmentPlanId?: string | null;
  items: BillingLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  exchangeRate: number;
  /** YYYY-MM-DD */
  validUntil?: string | null;
  invoiceId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateEstimateRequest {
  patientId: string;
  treatmentPlanId?: string;
  items: BillingLineItemInput[];
  discount?: number;
  currency?: string;
  exchangeRate?: number;
  validUntil?: string;
  notes?: string;
  status?: "DRAFT" | "SENT";
}

/** Lo omitido se conserva. */
export interface UpdateEstimateRequest {
  items?: BillingLineItemInput[];
  discount?: number;
  currency?: string;
  exchangeRate?: number;
  validUntil?: string;
  notes?: string;
}

export interface ConvertEstimateResult {
  estimate: EstimateResponse;
  invoice: InvoiceResponse;
}

// ─── Recibos ────────────────────────────────────────────────────────

export interface InvoiceResponse {
  id: string;
  clinicId: string;
  patientId: string;
  patientName?: string | null;
  /** R-000001 */
  code: string;
  documentType: "RECEIPT";
  fiscal: false;
  status: InvoiceStatus;
  estimateId?: string | null;
  treatmentPlanId?: string | null;
  items: BillingLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  currency: string;
  exchangeRate: number;
  notes?: string | null;
  issuedAt: string;
  /** YYYY-MM-DD */
  dueDate?: string | null;
  voidReason?: string | null;
  voidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateInvoiceRequest {
  patientId: string;
  estimateId?: string;
  treatmentPlanId?: string;
  /** Al menos uno de `items` o `chargeIds`. */
  items?: BillingLineItemInput[];
  chargeIds?: string[];
  discount?: number;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  dueDate?: string;
}

export interface UpdateInvoiceRequest {
  items?: BillingLineItemInput[];
  discount?: number;
  notes?: string;
  dueDate?: string;
}

/** Motivo de 5 a 500 caracteres. */
export interface ReasonRequest {
  reason: string;
}

// ─── Pagos y devoluciones ───────────────────────────────────────────

export interface PaymentResponse {
  id: string;
  patientId: string;
  patientName?: string | null;
  /** null = anticipo */
  invoiceId?: string | null;
  amount: number;
  currency: string;
  exchangeRate: number;
  /** Aplicado al recibo, en la moneda del recibo. */
  appliedAmount?: number | null;
  refundedAmount: number;
  method: PaymentMethod;
  reference?: string | null;
  paidAt: string;
  receivedBy?: string | null;
  notes?: string | null;
  voided: boolean;
  voidReason?: string | null;
  cashSessionId?: string | null;
  createdAt: string;
  version: number;
}

export interface RegisterPaymentRequest {
  patientId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: string;
  notes?: string;
}

/** Resultado de POST /billing/payments: 201 = pago nuevo, 200 = reintento (mismo pago). */
export interface RegisterPaymentResult {
  payment: PaymentResponse;
  replayed: boolean;
}

export interface RefundRequest {
  amount: number;
  method: RefundMethod;
  reason: string;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  patientId: string;
  amount: number;
  currency: string;
  appliedAmount?: number | null;
  method: RefundMethod;
  reason: string;
  refundedAt: string;
  refundedBy?: string | null;
  cashSessionId?: string | null;
}

// ─── Cargos ─────────────────────────────────────────────────────────

export interface ChargeResponse {
  id: string;
  patientId: string;
  patientName?: string | null;
  sourceType: ChargeSource;
  /** Id de la cita si viene de APPOINTMENT. */
  sourceId?: string | null;
  doctorId?: string | null;
  serviceId?: string | null;
  serviceCode?: string | null;
  description: string;
  toothRef?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: string;
  status: ChargeStatus;
  invoiceId?: string | null;
  dismissReason?: string | null;
  performedAt: string;
  createdAt: string;
  version: number;
}

export interface CreateChargeRequest {
  patientId: string;
  serviceId?: string;
  description: string;
  toothRef?: string;
  quantity: number;
  unitPrice: number;
  performedAt?: string;
}

// ─── Caja ───────────────────────────────────────────────────────────

export interface CashSessionResponse {
  id: string;
  status: CashSessionStatus;
  currency: string;
  openingFloat: number;
  cashIn: number;
  cashOut: number;
  /** En vivo mientras está OPEN. */
  expectedCash: number;
  countedCash?: number | null;
  difference?: number | null;
  openedBy: string;
  openedAt: string;
  closedBy?: string | null;
  closedAt?: string | null;
  /** Efectivo neto en otras monedas: no entra al arqueo. */
  otherCurrencies: Record<string, number>;
  notes?: string | null;
  version: number;
}

export interface OpenCashRequest {
  openingFloat: number;
  notes?: string;
}

export interface CloseCashRequest {
  countedCash: number;
  notes?: string;
  version: number;
}

// ─── Cuenta del paciente y reportes ─────────────────────────────────

export interface PatientLedgerResponse {
  patientId: string;
  /** Moneda base de la clínica. */
  currency: string;
  totalCharged: number;
  totalPaid: number;
  /** > 0 debe, < 0 a favor. */
  balance: number;
  /** Anticipos sin usar. */
  creditBalance: number;
  estimates: EstimateResponse[];
  invoices: InvoiceResponse[];
  payments: PaymentResponse[];
  pendingCharges: ChargeResponse[];
}

export type CashSummaryMethod = "CASH" | "CARD_POS" | "TRANSFER" | "OTHER";

export interface CashSummaryResponse {
  date: string;
  currency: string;
  collectedTotal: number;
  byMethod: Record<CashSummaryMethod, number>;
  refundedTotal: number;
  pendingTotal: number;
  patientsWithBalance: number;
}

export interface ReceivableAging {
  current: number;
  days31To60: number;
  days61To90: number;
  over90: number;
}

export interface ReceivableListItem {
  patientId: string;
  patientName?: string | null;
  balance: number;
  currency: string;
  oldestDueDate?: string | null;
  invoiceCount: number;
  aging: ReceivableAging;
}

export interface FinanceDashboardResponse {
  from: string;
  to: string;
  currency: string;
  issuedTotal: number;
  discountTotal: number;
  collectedTotal: number;
  refundedTotal: number;
  outstandingTotal: number;
  collectedByMethod: Record<string, number>;
  documentsIssued: number;
  paymentsCount: number;
  pendingCharges: number;
}

// ─── Tipos de cambio y configuración ────────────────────────────────

export interface ExchangeRateResponse {
  base: string;
  target: string;
  rate: number;
  asOf: string;
}

export interface SetExchangeRateRequest {
  target: string;
  rate: number;
  asOf?: string;
}

export interface FinanceSettings {
  baseCurrency: string;
  baseCurrencyConfigured: boolean;
  chargePolicy: ChargePolicy;
  allowAdvances: boolean;
  requireCashSession: boolean;
  maxDiscountPercent: number;
  /** 0 = nunca guardada. */
  version: number;
}

export interface UpdateFinanceSettingsRequest {
  /** null = usar la moneda de la clínica. */
  baseCurrency: string | null;
  chargePolicy: ChargePolicy;
  allowAdvances: boolean;
  requireCashSession: boolean;
  maxDiscountPercent: number;
  version: number;
}

// ─── Query params ───────────────────────────────────────────────────

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface EstimateQuery extends PageParams {
  patientId?: string;
  status?: EstimateStatus;
  q?: string;
}

export interface InvoiceQuery extends PageParams {
  patientId?: string;
  status?: InvoiceStatus;
  q?: string;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
}

export interface PaymentQuery extends PageParams {
  patientId?: string;
  from?: string;
  to?: string;
}

export type RefundQuery = PaymentQuery;

export interface ChargeQuery extends PageParams {
  patientId?: string;
  status?: ChargeStatus;
}

export interface ReceivableQuery extends PageParams {
  q?: string;
}

export interface DashboardQuery {
  from?: string;
  to?: string;
}

export interface ExchangeRateQuery {
  base?: string;
  target: string;
}

// ─── Capacidades de la clínica (interruptor del módulo) ─────────────

export interface ClinicCapabilities {
  specialty: string | null;
  plan: string | null;
  operationalStatus: string | null;
  modules: string[];
}

export const FINANCE_MODULE = "FINANCE";

// ─── Reglas de negocio puras ────────────────────────────────────────

/** Transiciones de estado permitidas por el backend (§7 Presupuestos). */
export const ESTIMATE_TRANSITIONS: Record<EstimateStatus, EstimateStatusChange[]> = {
  DRAFT: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["REJECTED"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

export function canTransitionEstimate(
  from: EstimateStatus,
  to: EstimateStatusChange,
): boolean {
  return ESTIMATE_TRANSITIONS[from].includes(to);
}

/** Solo se editan en DRAFT o SENT. */
export function isEstimateEditable(status: EstimateStatus): boolean {
  return status === "DRAFT" || status === "SENT";
}

/** Convertir en recibo: desde DRAFT, SENT o ACCEPTED. */
export function isEstimateConvertible(status: EstimateStatus): boolean {
  return status === "DRAFT" || status === "SENT" || status === "ACCEPTED";
}

/** Ítems y descuento solo si no tiene pagos y ninguna línea viene de un cargo. */
export function areInvoiceItemsEditable(invoice: InvoiceResponse): boolean {
  return (
    invoice.status !== "VOID" &&
    invoice.paidAmount === 0 &&
    !invoice.items.some((item) => item.chargeId)
  );
}

/** Monto que aún se puede devolver de un pago. */
export function refundableAmount(payment: PaymentResponse): number {
  return Math.max(0, Math.round((payment.amount - payment.refundedAmount) * 100) / 100);
}

// ─── Etiquetas (español) ────────────────────────────────────────────

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  EXPIRED: "Vencido",
  CONVERTED: "Convertido",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  ISSUED: "Emitido",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagado",
  VOID: "Anulado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD_POS: "Tarjeta (POS)",
  TRANSFER: "Transferencia",
  ADVANCE: "Saldo a favor",
  OTHER: "Otro",
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  PENDING: "Pendiente",
  BILLED: "Cobrado",
  DISMISSED: "Descartado",
};

export const CHARGE_POLICY_LABELS: Record<ChargePolicy, { label: string; description: string }> = {
  OFF: {
    label: "Desactivado",
    description: "Al completar una cita no se crea ningún cargo.",
  },
  SUGGEST: {
    label: "Sugerir (recomendado)",
    description: "Cada servicio de la cita queda como cargo pendiente para que caja lo cobre.",
  },
  AUTO: {
    label: "Automático",
    description: "Al completar la cita se emite el recibo con sus servicios sin intervención.",
  },
};
