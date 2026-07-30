export * from "@/lib/odontogram/domain/odontogram/types"
export * from "@/lib/odontogram/domain/odontogram/constants"
export { PROCEDURE_CATALOG_MOCK as PROCEDURE_CATALOG } from "@/lib/odontogram/infrastructure/data/mock/procedure-catalog.mock"
export { PROCEDURE_TEMPLATES_MOCK as PROCEDURE_TEMPLATES } from "@/lib/odontogram/infrastructure/data/mock/procedure-templates.mock"
export { TOOTH_TEMPLATES_MOCK as TOOTH_TEMPLATES } from "@/lib/odontogram/infrastructure/data/mock/tooth-templates.mock"
export { PROCEDURE_PROTOCOLS_MOCK as PROCEDURE_PROTOCOLS } from "@/lib/odontogram/infrastructure/data/mock/procedure-protocols.mock"
import {
  ToothTypeService,
  ICDASService,
  LesionService,
  TreatmentSuggestionService,
  ProcedureFilterService,
  PlanCalculationService,
  CariesRiskService,
  ClinicalConsistencyService,
  ClinicalEventStateMachine,
} from "@/lib/odontogram/domain/odontogram/services"

export {
  ToothTypeService,
  ICDASService,
  LesionService,
  TreatmentSuggestionService,
  ProcedureFilterService,
  PlanCalculationService,
  CariesRiskService,
  ClinicalConsistencyService,
  ClinicalEventStateMachine,
}
