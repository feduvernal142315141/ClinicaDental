/**
 * Doctors Components Module
 *
 * Barrel export for doctors module UI components.
 */

// Main components
export { DoctorsList } from "./DoctorsList";
export { DoctorForm } from "./DoctorForm";
export { DoctorDetail } from "./DoctorDetail";

// Form field components
export { BasicInfoFields } from "./BasicInfoFields";
export { ProfessionalInfoFields } from "./ProfessionalInfoFields";
export { SecurityFields } from "./SecurityFields";
export { RoleStatusFields } from "./RoleStatusFields";
export { FormActions } from "./FormActions";
export { PasswordStrength } from "./PasswordStrength";
export { AvatarUpload } from "./AvatarUpload";
export { DoctorScheduleFields } from "./DoctorScheduleFields";

// Table configuration
export { getDoctorsColumns } from "./doctors-table.config";
