/**
 * Odontogram Hooks Module
 *
 * Barrel export for odontogram hooks.
 */

export { useOdontogram } from "./useOdontogram";
export { useTreatmentPlans } from "./useTreatmentPlans";
export { useTreatmentPlanItems } from "./useTreatmentPlanItems";
export type {
  UseTreatmentPlanItemsResult,
  TreatmentPlanItemsTotals,
} from "./useTreatmentPlanItems";
export {
  usePatientTreatmentPlan,
  DEFAULT_TREATMENT_PLAN_NAME,
} from "./usePatientTreatmentPlan";
export type { UsePatientTreatmentPlanResult } from "./usePatientTreatmentPlan";
export { useTreatmentPlanBoard } from "./useTreatmentPlanBoard";
export type {
  UseTreatmentPlanBoardResult,
  PlanItemRow,
  PlanItemGroup,
  PlanGroupKind,
} from "./useTreatmentPlanBoard";
export {
  useTreatmentPlanFilters,
  ALL_FILTER_VALUE,
  NO_PHASE_VALUE,
} from "./useTreatmentPlanFilters";
export type {
  UseTreatmentPlanFiltersResult,
  PlanBoardFilters,
  PlanFilterOption,
  PlanScopeFilter,
} from "./useTreatmentPlanFilters";
export { useAddToPlanCatalog } from "./useAddToPlanCatalog";
export type { UseAddToPlanCatalogResult } from "./useAddToPlanCatalog";
