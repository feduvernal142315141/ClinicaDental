import type {
  ChargeQuery,
  DashboardQuery,
  EstimateQuery,
  InvoiceQuery,
  PageParams,
  PaymentQuery,
  ReceivableQuery,
  RefundQuery,
} from "@/lib/entity/billing";

/**
 * Claves de React Query del módulo de Finanzas.
 * Todo cuelga de `["billing"]` para poder invalidar o descartar el módulo entero de una vez
 * (p. ej. cuando KodeWave lo apaga).
 */
export const billingKeys = {
  all: ["billing"] as const,
  ledger: (patientId: string) => ["billing", "ledger", patientId] as const,
  ledgers: () => ["billing", "ledger"] as const,
  estimates: () => ["billing", "estimates"] as const,
  estimateList: (query: EstimateQuery) => ["billing", "estimates", "list", query] as const,
  estimate: (id: string) => ["billing", "estimates", "detail", id] as const,
  invoices: () => ["billing", "invoices"] as const,
  invoiceList: (query: InvoiceQuery) => ["billing", "invoices", "list", query] as const,
  invoice: (id: string) => ["billing", "invoices", "detail", id] as const,
  payments: () => ["billing", "payments"] as const,
  paymentList: (query: PaymentQuery) => ["billing", "payments", "list", query] as const,
  refunds: () => ["billing", "refunds"] as const,
  refundList: (query: RefundQuery) => ["billing", "refunds", "list", query] as const,
  charges: () => ["billing", "charges"] as const,
  chargeList: (query: ChargeQuery) => ["billing", "charges", "list", query] as const,
  cash: () => ["billing", "cash"] as const,
  cashCurrent: () => ["billing", "cash", "current"] as const,
  cashHistory: (query: PageParams) => ["billing", "cash", "history", query] as const,
  cashSummary: (date?: string) => ["billing", "cash-summary", date ?? "today"] as const,
  cashSummaries: () => ["billing", "cash-summary"] as const,
  receivables: (query: ReceivableQuery) => ["billing", "receivables", query] as const,
  receivablesAll: () => ["billing", "receivables"] as const,
  dashboard: (query: DashboardQuery) => ["billing", "dashboard", query] as const,
  dashboards: () => ["billing", "dashboard"] as const,
  settings: () => ["billing", "settings"] as const,
  exchangeRate: (target: string) => ["billing", "exchange-rate", target] as const,
  exchangeRates: () => ["billing", "exchange-rate"] as const,
};

/** Capabilities vive fuera de "billing": sobrevive aunque se descarte el módulo. */
export const capabilitiesKey = ["clinic", "capabilities"] as const;
