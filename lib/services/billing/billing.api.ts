import type {
  CashSessionResponse,
  CashSummaryResponse,
  ChargeResponse,
  ClinicCapabilities,
  ConvertEstimateResult,
  EstimateResponse,
  ExchangeRateResponse,
  FinanceDashboardResponse,
  FinanceSettings,
  InvoiceResponse,
  Paginated,
  PatientLedgerResponse,
  PaymentResponse,
  ReceivableListItem,
  RefundResponse,
} from "@/lib/entity/billing";
import {
  cashSessionResponseSchema,
  chargeResponseSchema,
  estimateResponseSchema,
  financeSettingsSchema,
  invoiceResponseSchema,
  paginatedSchema,
  patientLedgerResponseSchema,
  paymentResponseSchema,
  refundResponseSchema,
} from "@/lib/entity/billing/schemas";
import { isNotFoundError } from "./billing-errors";
import { billingRequest, pageParams } from "./billing-http";
import type { BillingServiceApi } from "./billing.contract";

/**
 * Finanzas — implementación HTTP real. Base `/billing/*`, respuestas sin envoltorio.
 * La UI no la usa directamente: pasa por `billing.service.ts` (conmutador mock ↔ API).
 */

const BASE = "/billing";

async function get<T>(url: string, options?: Parameters<typeof billingRequest>[2]): Promise<T> {
  return (await billingRequest<T>("GET", url, options)).data;
}

async function send<T>(
  method: "POST" | "PUT" | "PATCH",
  url: string,
  data?: unknown,
  options?: Parameters<typeof billingRequest>[2],
): Promise<T> {
  return (await billingRequest<T>(method, url, { ...options, data })).data;
}

export const billingApi: BillingServiceApi = {
  // ── Capacidades ────────────────────────────────────────────────────
  async getCapabilities() {
    return get<ClinicCapabilities>("/clinic/capabilities", { silent: true });
  },

  // ── Cuenta del paciente ────────────────────────────────────────────
  async getPatientLedger(patientId) {
    return get<PatientLedgerResponse>(`${BASE}/patients/${patientId}/ledger`, {
      schema: patientLedgerResponseSchema,
    });
  },

  // ── Presupuestos ───────────────────────────────────────────────────
  async getEstimates(query = {}) {
    return get<Paginated<EstimateResponse>>(`${BASE}/estimates`, {
      params: { ...pageParams(query.page, query.pageSize), patientId: query.patientId, status: query.status, q: query.q },
      schema: paginatedSchema(estimateResponseSchema),
    });
  },
  async getEstimate(id) {
    return get<EstimateResponse>(`${BASE}/estimates/${id}`, { schema: estimateResponseSchema });
  },
  async createEstimate(data) {
    return send<EstimateResponse>("POST", `${BASE}/estimates`, data, { schema: estimateResponseSchema });
  },
  async updateEstimate(id, data) {
    return send<EstimateResponse>("PUT", `${BASE}/estimates/${id}`, data, { schema: estimateResponseSchema });
  },
  async changeEstimateStatus(id, status) {
    return send<EstimateResponse>("PATCH", `${BASE}/estimates/${id}/status`, { status }, {
      schema: estimateResponseSchema,
    });
  },
  async convertEstimate(id) {
    return send<ConvertEstimateResult>("POST", `${BASE}/estimates/${id}/convert`);
  },

  // ── Recibos ────────────────────────────────────────────────────────
  async getInvoices(query = {}) {
    return get<Paginated<InvoiceResponse>>(`${BASE}/invoices`, {
      params: {
        ...pageParams(query.page, query.pageSize),
        patientId: query.patientId,
        status: query.status,
        q: query.q,
        from: query.from,
        to: query.to,
      },
      schema: paginatedSchema(invoiceResponseSchema),
    });
  },
  async getInvoice(id) {
    return get<InvoiceResponse>(`${BASE}/invoices/${id}`, { schema: invoiceResponseSchema });
  },
  async createInvoice(data) {
    return send<InvoiceResponse>("POST", `${BASE}/invoices`, data, { schema: invoiceResponseSchema });
  },
  async updateInvoice(id, data) {
    return send<InvoiceResponse>("PUT", `${BASE}/invoices/${id}`, data, { schema: invoiceResponseSchema });
  },
  async voidInvoice(id, reason) {
    return send<InvoiceResponse>("PATCH", `${BASE}/invoices/${id}/void`, { reason }, {
      schema: invoiceResponseSchema,
    });
  },

  // ── Pagos y devoluciones ───────────────────────────────────────────
  async getPayments(query = {}) {
    return get<Paginated<PaymentResponse>>(`${BASE}/payments`, {
      params: { ...pageParams(query.page, query.pageSize), patientId: query.patientId, from: query.from, to: query.to },
      schema: paginatedSchema(paymentResponseSchema),
    });
  },
  async registerPayment(data, idempotencyKey) {
    const response = await billingRequest<PaymentResponse>("POST", `${BASE}/payments`, {
      data,
      headers: { "Idempotency-Key": idempotencyKey },
      schema: paymentResponseSchema,
    });
    // 201 = pago nuevo; 200 = reintento con la misma clave (el backend devuelve el mismo pago).
    return { payment: response.data, replayed: response.status === 200 };
  },
  async voidPayment(id, reason) {
    return send<PaymentResponse>("PATCH", `${BASE}/payments/${id}/void`, { reason }, {
      schema: paymentResponseSchema,
    });
  },
  async refundPayment(paymentId, data) {
    return send<RefundResponse>("POST", `${BASE}/payments/${paymentId}/refunds`, data, {
      schema: refundResponseSchema,
    });
  },
  async getRefunds(query = {}) {
    return get<Paginated<RefundResponse>>(`${BASE}/refunds`, {
      params: { ...pageParams(query.page, query.pageSize), patientId: query.patientId, from: query.from, to: query.to },
      schema: paginatedSchema(refundResponseSchema),
    });
  },

  // ── Cargos ─────────────────────────────────────────────────────────
  async getCharges(query = {}) {
    return get<Paginated<ChargeResponse>>(`${BASE}/charges`, {
      params: { ...pageParams(query.page, query.pageSize), patientId: query.patientId, status: query.status },
      schema: paginatedSchema(chargeResponseSchema),
    });
  },
  async createCharge(data) {
    return send<ChargeResponse>("POST", `${BASE}/charges`, data, { schema: chargeResponseSchema });
  },
  async dismissCharge(id, reason) {
    return send<ChargeResponse>("PATCH", `${BASE}/charges/${id}/dismiss`, { reason }, {
      schema: chargeResponseSchema,
    });
  },

  // ── Caja ───────────────────────────────────────────────────────────
  async getCurrentCashSession(options) {
    try {
      return await get<CashSessionResponse>(`${BASE}/cash-sessions/current`, {
        silent: options?.silent,
        expectedStatuses: [404],
        schema: cashSessionResponseSchema,
      });
    } catch (error) {
      if (isNotFoundError(error)) return null; // 404 = no hay caja abierta
      throw error;
    }
  },
  async getCashSessions(query = {}) {
    return get<Paginated<CashSessionResponse>>(`${BASE}/cash-sessions`, {
      params: pageParams(query.page, query.pageSize),
      schema: paginatedSchema(cashSessionResponseSchema),
    });
  },
  async openCashSession(data) {
    return send<CashSessionResponse>("POST", `${BASE}/cash-sessions/open`, data, {
      schema: cashSessionResponseSchema,
    });
  },
  async closeCashSession(id, data) {
    return send<CashSessionResponse>("POST", `${BASE}/cash-sessions/${id}/close`, data, {
      schema: cashSessionResponseSchema,
    });
  },

  // ── Reportes ───────────────────────────────────────────────────────
  async getCashSummary(date) {
    return get<CashSummaryResponse>(`${BASE}/cash-summary`, { params: { date } });
  },
  async getReceivables(query = {}) {
    return get<Paginated<ReceivableListItem>>(`${BASE}/receivables`, {
      params: { ...pageParams(query.page, query.pageSize), q: query.q },
    });
  },
  async getDashboard(query = {}) {
    return get<FinanceDashboardResponse>(`${BASE}/dashboard`, { params: { from: query.from, to: query.to } });
  },

  // ── Configuración y tipos de cambio ────────────────────────────────
  async getSettings() {
    return get<FinanceSettings>(`${BASE}/settings`, { schema: financeSettingsSchema });
  },
  async updateSettings(data) {
    return send<FinanceSettings>("PUT", `${BASE}/settings`, data, { schema: financeSettingsSchema });
  },
  async getExchangeRate(query) {
    try {
      return await get<ExchangeRateResponse>(`${BASE}/exchange-rates`, {
        params: { base: query.base, target: query.target },
        expectedStatuses: [404],
      });
    } catch (error) {
      if (isNotFoundError(error)) return null; // 404 = no hay tasa registrada
      throw error;
    }
  },
  async setExchangeRate(data) {
    return send<ExchangeRateResponse>("POST", `${BASE}/exchange-rates`, data);
  },
};
