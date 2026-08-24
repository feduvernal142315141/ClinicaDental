export * from "@/lib/odontogram/domain/odontogram/types"
export * from "@/lib/odontogram/domain/odontogram/constants"
// El catálogo de procedimientos y las plantillas de tratamiento ya NO se
// reexportan desde aquí: son datos de la clínica y se piden al backend con
// `useOdontogramServices` / `useServiceTemplates`. Reexportarlos como
// constantes invitaba a consumirlos de forma síncrona, que es justo lo que
// permitía que un mock se colara en el plan de un paciente.
// `TOOTH_TEMPLATES` sí se queda: son presets clínicos de superficie, no servicios.
export { TOOTH_TEMPLATES_MOCK as TOOTH_TEMPLATES } from "@/lib/odontogram/infrastructure/data/mock/tooth-templates.mock"
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
