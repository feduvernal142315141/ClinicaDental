export * from "@/lib/odontogram/domain/odontogram/types"
export * from "@/lib/odontogram/domain/odontogram/constants"
export { TREATMENT_CATALOG_MOCK as TREATMENT_CATALOG } from "@/lib/odontogram/infrastructure/data/mock/treatment-catalog.mock"
export { PROCEDURE_CATALOG_MOCK as PROCEDURE_CATALOG } from "@/lib/odontogram/infrastructure/data/mock/procedure-catalog.mock"
export { PROCEDURE_TEMPLATES_MOCK as PROCEDURE_TEMPLATES } from "@/lib/odontogram/infrastructure/data/mock/procedure-templates.mock"
export { TOOTH_TEMPLATES_MOCK as TOOTH_TEMPLATES } from "@/lib/odontogram/infrastructure/data/mock/tooth-templates.mock"
export { PROCEDURE_PROTOCOLS_MOCK as PROCEDURE_PROTOCOLS } from "@/lib/odontogram/infrastructure/data/mock/procedure-protocols.mock"
import {
  ColorService,
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
  ColorService,
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

export const getEventColor = ColorService.getEventColor
export const getICDASColorIntensity = ColorService.getICDASColor
export const getToothTypeName = ToothTypeService.getToothTypeName
export const getICDASColor = ICDASService.getColor
export const getLesionIcon = LesionService.getIcon
