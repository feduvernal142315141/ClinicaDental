import { billingApi } from "./billing.api";
import { billingMock } from "./billing.mock";

/**
 * Billing service — API pública del dominio.
 *
 * Front-first: con NEXT_PUBLIC_BILLING_MOCK=true usa store en memoria.
 * Cuando backend exponga /billing/*, apagar la bandera (cero cambios en UI/hooks).
 */
const useMock = process.env.NEXT_PUBLIC_BILLING_MOCK === "true";

export const billingService = useMock ? billingMock : billingApi;

export type { BillingServiceApi } from "./billing.api";
export { BILLING_MOCK_DEMO_PATIENT_ID } from "./billing.mock";
