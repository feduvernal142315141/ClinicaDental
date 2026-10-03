import { billingApi } from "./billing.api";
import type { BillingServiceApi } from "./billing.contract";
import { billingMock } from "./billing.mock";

/**
 * Conmutador del servicio de Finanzas.
 *
 * - NEXT_PUBLIC_BILLING_MOCK=true  → mock en memoria (mismo contrato y reglas).
 * - NEXT_PUBLIC_BILLING_MOCK=false → API real (`/billing/*` y `/clinic/capabilities`).
 *
 * La UI y los hooks no cambian entre uno y otro.
 */
export const isBillingMockEnabled = process.env.NEXT_PUBLIC_BILLING_MOCK === "true";

export const billingService: BillingServiceApi = isBillingMockEnabled ? billingMock : billingApi;
