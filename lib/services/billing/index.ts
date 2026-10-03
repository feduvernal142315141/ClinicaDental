export { billingService, isBillingMockEnabled } from "./billing.service";
export type { BillingServiceApi } from "./billing.contract";
export { BILLING_MOCK_DEMO_PATIENT_ID } from "./billing.mock";
export {
  BillingApiError,
  billingErrorMessage,
  FINANCE_MODULE_DISABLED_MESSAGE,
  isBillingApiError,
  isConflictError,
  isModuleDisabledError,
  isNotFoundError,
  onFinanceModuleDisabled,
  type BillingErrorKind,
} from "./billing-errors";
