// `ColorService` se eliminó: era una SEGUNDA implementación de color divergente
// (tipaba la superficie como `string` y pintaba todas las caras cuando el evento
// no tenía ninguna). Ningún componente la consumía. La única verdad de color es
// `OdontogramColorService`.
export { ToothTypeService } from "./ToothTypeService"
export { ICDASService } from "./ICDASService"
export { LesionService } from "./LesionService"
export { TreatmentSuggestionService } from "./TreatmentSuggestionService"
export { ProcedureFilterService } from "./ProcedureFilterService"
export { PlanCalculationService } from "./PlanCalculationService"
export { OdontogramColorService } from "./OdontogramColorService"
export { ToothSymbolService } from "./ToothSymbolService"
export { CariesRiskService } from "./CariesRiskService"
export { ClinicalEventStateMachine } from "./ClinicalEventStateMachine"
export { ClinicalConsistencyService } from "./ClinicalConsistencyService"

export type { TreatmentSuggestion } from "./TreatmentSuggestionService"
export type { PlanTotals } from "./PlanCalculationService"
export type {
  CariesRiskResult,
  CariesRiskExtraFactors,
} from "./CariesRiskService"
export type { ConsistencyWarning } from "./ClinicalConsistencyService"
