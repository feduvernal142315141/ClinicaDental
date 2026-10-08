"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { billingService } from "@/lib/services/billing";
import { billingKeys } from "./billing-query-keys";

/**
 * Lecturas de Finanzas (React Query). Las listas conservan la página anterior mientras
 * cargan la siguiente para que la tabla no parpadee.
 */

export function usePatientLedger(patientId: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.ledger(patientId ?? ""),
    queryFn: () => billingService.getPatientLedger(patientId as string),
    enabled: !!patientId && (options.enabled ?? true),
  });
}

export function useEstimateList(query: EstimateQuery) {
  return useQuery({
    queryKey: billingKeys.estimateList(query),
    queryFn: () => billingService.getEstimates(query),
    placeholderData: keepPreviousData,
  });
}

export function useEstimate(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.estimate(id ?? ""),
    queryFn: () => billingService.getEstimate(id as string),
    enabled: !!id,
  });
}

export function useInvoiceList(query: InvoiceQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.invoiceList(query),
    queryFn: () => billingService.getInvoices(query),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.invoice(id ?? ""),
    queryFn: () => billingService.getInvoice(id as string),
    enabled: !!id,
  });
}

export function usePaymentList(query: PaymentQuery) {
  return useQuery({
    queryKey: billingKeys.paymentList(query),
    queryFn: () => billingService.getPayments(query),
    placeholderData: keepPreviousData,
  });
}

export function useRefundList(query: RefundQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.refundList(query),
    queryFn: () => billingService.getRefunds(query),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useChargeList(query: ChargeQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.chargeList(query),
    queryFn: () => billingService.getCharges(query),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/**
 * Caja actual (`null` = no hay caja abierta).
 * `live`: refresca cada 30 s y al volver el foco, para el esperado en vivo de la pantalla de Caja.
 */
export function useCurrentCashSession(options: { live?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.cashCurrent(),
    queryFn: () => billingService.getCurrentCashSession({ silent: true }),
    refetchInterval: options.live ? 30_000 : false,
    refetchOnWindowFocus: options.live ?? false,
    enabled: options.enabled ?? true,
  });
}

export function useCashSessionHistory(query: PageParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.cashHistory(query),
    queryFn: () => billingService.getCashSessions(query),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useCashSummary(date: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.cashSummary(date),
    queryFn: () => billingService.getCashSummary(date),
    enabled: options.enabled ?? true,
  });
}

export function useReceivables(query: ReceivableQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.receivables(query),
    queryFn: () => billingService.getReceivables(query),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useFinanceDashboard(query: DashboardQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.dashboard(query),
    queryFn: () => billingService.getDashboard(query),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useFinanceSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: billingKeys.settings(),
    queryFn: () => billingService.getSettings(),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

/** Tasa vigente base → `target` (`null` si no hay ninguna registrada). */
export function useExchangeRate(target: string | undefined, baseCurrency: string | undefined) {
  return useQuery({
    queryKey: billingKeys.exchangeRate(target ?? ""),
    queryFn: () => billingService.getExchangeRate({ target: target as string }),
    enabled: !!target && !!baseCurrency && target !== baseCurrency,
  });
}
