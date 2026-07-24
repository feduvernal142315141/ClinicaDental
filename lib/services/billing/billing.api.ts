import { handleServiceError } from "@/lib/utils/error.utils";
import {
  serviceGet,
  servicePost,
  servicePut,
  servicePatch,
} from "../baseService";
import type {
  BillingQueryParams,
  CashSummaryResponse,
  ConvertEstimateResult,
  CreateEstimateRequest,
  CreateInvoiceRequest,
  EstimateResponse,
  ExchangeRateResponse,
  InvoiceResponse,
  PaginatedEstimatesResponse,
  PaginatedInvoicesResponse,
  PaginatedPaymentsResponse,
  PaginatedReceivablesResponse,
  PatientLedgerResponse,
  PaymentResponse,
  RegisterPaymentRequest,
  UpdateEstimateRequest,
  UpdateEstimateStatusRequest,
  UpdateInvoiceRequest,
} from "@/lib/entity/billing";

/**
 * Billing API — implementación HTTP real.
 * Base: /billing/*
 *
 * El front no llama esto directamente: usa billing.service.ts
 * (conmuta mock ↔ api vía NEXT_PUBLIC_BILLING_MOCK).
 */

const endpoint = "/billing";

function buildQueryString(params?: BillingQueryParams): string {
  if (!params) return "";

  const qp = new URLSearchParams();

  if (params.page !== undefined) qp.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    qp.append("pageSize", params.pageSize.toString());
  if (params.patientId) qp.append("patientId", params.patientId);
  if (params.status) qp.append("status", params.status);
  if (params.q) qp.append("q", params.q);
  if (params.from) qp.append("from", params.from);
  if (params.to) qp.append("to", params.to);

  if (params.filters?.length) {
    params.filters.forEach((f) => qp.append("filters", f));
  }
  if (params.orders?.length) {
    params.orders.forEach((o) => qp.append("orders", o));
  }

  return qp.toString();
}

// ─── Ledger ─────────────────────────────────────────────────────────

async function getPatientLedger(
  patientId: string,
): Promise<PatientLedgerResponse> {
  const response = await serviceGet<PatientLedgerResponse>(
    `${endpoint}/patients/${patientId}/ledger`,
  );
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar la cuenta del paciente",
  );
}

// ─── Estimates ──────────────────────────────────────────────────────

async function getEstimates(
  params?: BillingQueryParams,
): Promise<PaginatedEstimatesResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/estimates${qs ? `?${qs}` : ""}`;
  const response = await serviceGet<PaginatedEstimatesResponse>(url);
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar presupuestos",
  );
}

async function getEstimateById(id: string): Promise<EstimateResponse> {
  const response = await serviceGet<EstimateResponse>(
    `${endpoint}/estimates/${id}`,
  );
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar el presupuesto",
  );
}

async function createEstimate(
  data: CreateEstimateRequest,
): Promise<EstimateResponse> {
  const response = await servicePost<CreateEstimateRequest, EstimateResponse>(
    `${endpoint}/estimates`,
    data,
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al crear el presupuesto",
  );
}

async function updateEstimate(
  data: UpdateEstimateRequest,
): Promise<EstimateResponse> {
  const response = await servicePut<UpdateEstimateRequest, EstimateResponse>(
    `${endpoint}/estimates/${data.id}`,
    data,
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al actualizar el presupuesto",
  );
}

async function updateEstimateStatus(
  id: string,
  data: UpdateEstimateStatusRequest,
): Promise<EstimateResponse> {
  const response = await servicePatch<
    UpdateEstimateStatusRequest,
    EstimateResponse
  >(`${endpoint}/estimates/${id}/status`, data);
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al actualizar el estado del presupuesto",
  );
}

async function convertEstimate(id: string): Promise<ConvertEstimateResult> {
  const response = await servicePost<Record<string, never>, ConvertEstimateResult>(
    `${endpoint}/estimates/${id}/convert`,
    {},
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al convertir el presupuesto en factura",
  );
}

// ─── Invoices ───────────────────────────────────────────────────────

async function getInvoices(
  params?: BillingQueryParams,
): Promise<PaginatedInvoicesResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/invoices${qs ? `?${qs}` : ""}`;
  const response = await serviceGet<PaginatedInvoicesResponse>(url);
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar facturas",
  );
}

async function getInvoiceById(id: string): Promise<InvoiceResponse> {
  const response = await serviceGet<InvoiceResponse>(
    `${endpoint}/invoices/${id}`,
  );
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar la factura",
  );
}

async function createInvoice(
  data: CreateInvoiceRequest,
): Promise<InvoiceResponse> {
  const response = await servicePost<CreateInvoiceRequest, InvoiceResponse>(
    `${endpoint}/invoices`,
    data,
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al crear la factura",
  );
}

async function updateInvoice(
  data: UpdateInvoiceRequest,
): Promise<InvoiceResponse> {
  const response = await servicePut<UpdateInvoiceRequest, InvoiceResponse>(
    `${endpoint}/invoices/${data.id}`,
    data,
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al actualizar la factura",
  );
}

async function voidInvoice(id: string): Promise<InvoiceResponse> {
  const response = await servicePatch<Record<string, never>, InvoiceResponse>(
    `${endpoint}/invoices/${id}/void`,
    {},
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al anular la factura",
  );
}

// ─── Payments ───────────────────────────────────────────────────────

async function getPayments(
  params?: BillingQueryParams,
): Promise<PaginatedPaymentsResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/payments${qs ? `?${qs}` : ""}`;
  const response = await serviceGet<PaginatedPaymentsResponse>(url);
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar pagos",
  );
}

async function registerPayment(
  data: RegisterPaymentRequest,
): Promise<PaymentResponse> {
  const response = await servicePost<RegisterPaymentRequest, PaymentResponse>(
    `${endpoint}/payments`,
    data,
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al registrar el pago",
  );
}

async function voidPayment(id: string): Promise<PaymentResponse> {
  const response = await servicePatch<Record<string, never>, PaymentResponse>(
    `${endpoint}/payments/${id}/void`,
    {},
  );
  if (
    response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300 &&
    response.data
  ) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al anular el pago",
  );
}

// ─── Cash / receivables (Fase 2) ────────────────────────────────────

async function getCashSummary(date: string): Promise<CashSummaryResponse> {
  const response = await serviceGet<CashSummaryResponse>(
    `${endpoint}/cash-summary?date=${encodeURIComponent(date)}`,
  );
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar el resumen de caja",
  );
}

async function getReceivables(
  params?: BillingQueryParams,
): Promise<PaginatedReceivablesResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/receivables${qs ? `?${qs}` : ""}`;
  const response = await serviceGet<PaginatedReceivablesResponse>(url);
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al cargar cuentas por cobrar",
  );
}

// ─── Exchange rates ─────────────────────────────────────────────────

async function getExchangeRate(
  base: string,
  target: string,
): Promise<ExchangeRateResponse> {
  const response = await serviceGet<ExchangeRateResponse>(
    `${endpoint}/exchange-rates?base=${encodeURIComponent(base)}&target=${encodeURIComponent(target)}`,
  );
  if (response?.data) return response.data;
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "Error al obtener el tipo de cambio",
  );
}

export const billingApi = {
  getPatientLedger,
  getEstimates,
  getEstimateById,
  createEstimate,
  updateEstimate,
  updateEstimateStatus,
  convertEstimate,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  voidInvoice,
  getPayments,
  registerPayment,
  voidPayment,
  getCashSummary,
  getReceivables,
  getExchangeRate,
};

export type BillingServiceApi = typeof billingApi;
