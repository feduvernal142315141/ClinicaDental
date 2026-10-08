import type {
  CashSessionResponse,
  CashSummaryResponse,
  ChargeQuery,
  ChargeResponse,
  ClinicCapabilities,
  CloseCashRequest,
  ConvertEstimateResult,
  CreateChargeRequest,
  CreateEstimateRequest,
  CreateInvoiceRequest,
  DashboardQuery,
  EstimateQuery,
  EstimateResponse,
  EstimateStatusChange,
  ExchangeRateQuery,
  ExchangeRateResponse,
  FinanceDashboardResponse,
  FinanceSettings,
  InvoiceQuery,
  InvoiceResponse,
  OpenCashRequest,
  PageParams,
  Paginated,
  PatientLedgerResponse,
  PaymentQuery,
  PaymentResponse,
  ReceivableListItem,
  ReceivableQuery,
  RefundQuery,
  RefundRequest,
  RefundResponse,
  RegisterPaymentRequest,
  RegisterPaymentResult,
  SetExchangeRateRequest,
  UpdateEstimateRequest,
  UpdateFinanceSettingsRequest,
  UpdateInvoiceRequest,
} from "@/lib/entity/billing";

/**
 * Contrato del servicio de Finanzas (docs/finance/frontend-prompt.md §6).
 * Lo implementan `billingApi` (HTTP real) y `billingMock` (memoria); la UI no distingue.
 *
 * Todos los métodos lanzan `BillingApiError` ante un error.
 * `getCurrentCashSession` y `getExchangeRate` devuelven `null` cuando el backend responde 404.
 */
export interface BillingServiceApi {
  // Capacidades de la clínica (interruptor del módulo)
  getCapabilities(): Promise<ClinicCapabilities>;

  // Cuenta del paciente
  getPatientLedger(patientId: string): Promise<PatientLedgerResponse>;

  // Presupuestos
  getEstimates(query?: EstimateQuery): Promise<Paginated<EstimateResponse>>;
  getEstimate(id: string): Promise<EstimateResponse>;
  createEstimate(data: CreateEstimateRequest): Promise<EstimateResponse>;
  updateEstimate(id: string, data: UpdateEstimateRequest): Promise<EstimateResponse>;
  changeEstimateStatus(id: string, status: EstimateStatusChange): Promise<EstimateResponse>;
  convertEstimate(id: string): Promise<ConvertEstimateResult>;

  // Recibos
  getInvoices(query?: InvoiceQuery): Promise<Paginated<InvoiceResponse>>;
  getInvoice(id: string): Promise<InvoiceResponse>;
  createInvoice(data: CreateInvoiceRequest): Promise<InvoiceResponse>;
  updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<InvoiceResponse>;
  voidInvoice(id: string, reason: string): Promise<InvoiceResponse>;

  // Pagos y devoluciones
  getPayments(query?: PaymentQuery): Promise<Paginated<PaymentResponse>>;
  registerPayment(data: RegisterPaymentRequest, idempotencyKey: string): Promise<RegisterPaymentResult>;
  voidPayment(id: string, reason: string): Promise<PaymentResponse>;
  refundPayment(paymentId: string, data: RefundRequest): Promise<RefundResponse>;
  getRefunds(query?: RefundQuery): Promise<Paginated<RefundResponse>>;

  // Cargos
  getCharges(query?: ChargeQuery): Promise<Paginated<ChargeResponse>>;
  createCharge(data: CreateChargeRequest): Promise<ChargeResponse>;
  dismissCharge(id: string, reason: string): Promise<ChargeResponse>;

  // Caja
  getCurrentCashSession(options?: { silent?: boolean }): Promise<CashSessionResponse | null>;
  getCashSessions(query?: PageParams): Promise<Paginated<CashSessionResponse>>;
  openCashSession(data: OpenCashRequest): Promise<CashSessionResponse>;
  closeCashSession(id: string, data: CloseCashRequest): Promise<CashSessionResponse>;

  // Reportes
  getCashSummary(date?: string): Promise<CashSummaryResponse>;
  getReceivables(query?: ReceivableQuery): Promise<Paginated<ReceivableListItem>>;
  getDashboard(query?: DashboardQuery): Promise<FinanceDashboardResponse>;

  // Configuración y tipos de cambio
  getSettings(): Promise<FinanceSettings>;
  updateSettings(data: UpdateFinanceSettingsRequest): Promise<FinanceSettings>;
  getExchangeRate(query: ExchangeRateQuery): Promise<ExchangeRateResponse | null>;
  setExchangeRate(data: SetExchangeRateRequest): Promise<ExchangeRateResponse>;
}
