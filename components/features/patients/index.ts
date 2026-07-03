/**
 * Patients Components Module
 *
 * Barrel export for patients module UI components.
 */

// List / Page content
export { PatientList } from "./PatientsPageContent/PatientList";

// Detail
export { PatientOdontogramPanel } from "./detail/PatientOdontogramPanel";

// Form
export { PatientForm } from "./form/PatientForm";
export { PatientFormFields } from "./form/PatientFormFields";

// Schema + types (re-exported for convenience)
export { patientFormSchema, type PatientFormValues } from "@/lib/entity/patients";
