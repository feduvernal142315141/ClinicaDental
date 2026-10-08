"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  CloseCashRequest,
  CreateChargeRequest,
  CreateEstimateRequest,
  CreateInvoiceRequest,
  EstimateStatusChange,
  OpenCashRequest,
  RefundRequest,
  RegisterPaymentRequest,
  SetExchangeRateRequest,
  UpdateEstimateRequest,
  UpdateFinanceSettingsRequest,
  UpdateInvoiceRequest,
} from "@/lib/entity/billing";
import { billingService } from "@/lib/services/billing";
import { billingKeys } from "./billing-query-keys";

/**
 * Mutaciones de Finanzas. Tras cualquier movimiento de dinero se invalidan las lecturas que
 * dependen de él (cuenta del paciente, recibos, pagos, caja, resumen, por cobrar, dashboard):
 * la UI vuelve a pintar lo que calcula el backend.
 */
export function invalidateMoneyQueries(queryClient: QueryClient) {
  const keys = [
    billingKeys.ledgers(),
    billingKeys.estimates(),
    billingKeys.invoices(),
    billingKeys.payments(),
    billingKeys.refunds(),
    billingKeys.charges(),
    billingKeys.cash(),
    billingKeys.cashSummaries(),
    billingKeys.receivablesAll(),
    billingKeys.dashboards(),
  ];
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function useMoneyMutation<TVariables, TResult>(fn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}

// ── Presupuestos ────────────────────────────────────────────────────

export function useCreateEstimate() {
  return useMoneyMutation((data: CreateEstimateRequest) => billingService.createEstimate(data));
}

export function useUpdateEstimate() {
  return useMoneyMutation(({ id, data }: { id: string; data: UpdateEstimateRequest }) =>
    billingService.updateEstimate(id, data),
  );
}

export function useChangeEstimateStatus() {
  return useMoneyMutation(({ id, status }: { id: string; status: EstimateStatusChange }) =>
    billingService.changeEstimateStatus(id, status),
  );
}

export function useConvertEstimate() {
  return useMoneyMutation((id: string) => billingService.convertEstimate(id));
}

// ── Recibos ─────────────────────────────────────────────────────────

export function useCreateInvoice() {
  return useMoneyMutation((data: CreateInvoiceRequest) => billingService.createInvoice(data));
}

export function useUpdateInvoice() {
  return useMoneyMutation(({ id, data }: { id: string; data: UpdateInvoiceRequest }) =>
    billingService.updateInvoice(id, data),
  );
}

export function useVoidInvoice() {
  return useMoneyMutation(({ id, reason }: { id: string; reason: string }) =>
    billingService.voidInvoice(id, reason),
  );
}

// ── Pagos y devoluciones ────────────────────────────────────────────

export function useRegisterPayment() {
  return useMoneyMutation(({ data, idempotencyKey }: { data: RegisterPaymentRequest; idempotencyKey: string }) =>
    billingService.registerPayment(data, idempotencyKey),
  );
}

export function useVoidPayment() {
  return useMoneyMutation(({ id, reason }: { id: string; reason: string }) =>
    billingService.voidPayment(id, reason),
  );
}

export function useRefundPayment() {
  return useMoneyMutation(({ paymentId, data }: { paymentId: string; data: RefundRequest }) =>
    billingService.refundPayment(paymentId, data),
  );
}

// ── Cargos ──────────────────────────────────────────────────────────

export function useCreateCharge() {
  return useMoneyMutation((data: CreateChargeRequest) => billingService.createCharge(data));
}

export function useDismissCharge() {
  return useMoneyMutation(({ id, reason }: { id: string; reason: string }) =>
    billingService.dismissCharge(id, reason),
  );
}

// ── Caja ────────────────────────────────────────────────────────────

export function useOpenCashSession() {
  return useMoneyMutation((data: OpenCashRequest) => billingService.openCashSession(data));
}

export function useCloseCashSession() {
  return useMoneyMutation(({ id, data }: { id: string; data: CloseCashRequest }) =>
    billingService.closeCashSession(id, data),
  );
}

// ── Configuración y tipos de cambio ─────────────────────────────────

export function useUpdateFinanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFinanceSettingsRequest) => billingService.updateSettings(data),
    onSuccess: (settings) => {
      queryClient.setQueryData(billingKeys.settings(), settings);
      return invalidateMoneyQueries(queryClient);
    },
  });
}

export function useSetExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetExchangeRateRequest) => billingService.setExchangeRate(data),
    onSuccess: (rate) => {
      queryClient.setQueryData(billingKeys.exchangeRate(rate.target), rate);
    },
  });
}
