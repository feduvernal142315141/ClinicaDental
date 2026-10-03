import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createBillingMock, type BillingMock } from "@/lib/services/billing/billing.mock";

/**
 * Utilidades de tests de componentes de Finanzas. Cada test monta su propio mock en memoria
 * (mismo contrato que el backend) y su propio QueryClient sin reintentos.
 *
 * Uso en el test:
 *   vi.mock("@/lib/services/billing/billing.service", async () => (await import("./billing-test-utils")).serviceModule());
 */

let current: BillingMock = createBillingMock({ delayMs: 0, seed: false });

export function resetBillingMock(): BillingMock {
  current = createBillingMock({ delayMs: 0, seed: false });
  return current;
}

export function billingMockInstance(): BillingMock {
  return current;
}

/** Módulo sustituto de `billing.service`: delega siempre en el mock vigente del test. */
export function serviceModule() {
  const billingService = new Proxy(
    {},
    {
      get: (_target, property: string) => (current.service as unknown as Record<string, unknown>)[property],
    },
  );
  return { billingService, isBillingMockEnabled: true };
}

export function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  };
}
