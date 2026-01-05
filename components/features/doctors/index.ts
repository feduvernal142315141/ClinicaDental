/**
 * Doctors Components Module
 *
 * Barrel export for doctors module UI components.
 */

// Main components
export { DoctorsList } from "./DoctorsPageContent/DoctorsList";
export { DoctorForm } from "./form/DoctorForm";
export { DoctorDetail } from "./detail/DoctorDetail";
export { ChangePasswordModal } from "./detail/ChangePasswordModal";

// Form field components
export { BasicInfoFields } from "./form/fields/BasicInfoFields";
export { ProfessionalInfoFields } from "./form/fields/ProfessionalInfoFields";
export { SecurityFields } from "./form/fields/SecurityFields";
export { RoleStatusFields } from "./form/fields/RoleStatusFields";
export { DoctorScheduleFields } from "./form/fields/DoctorScheduleFields";
export { FormActions } from "./form/components/FormActions";
export { PasswordStrength } from "../../ui/PasswordStrength";
export { AvatarUpload } from "./form/components/AvatarUpload";
export { DayScheduleRow } from "./schedule/DayScheduleRow";
export { ScheduleSectionHeader } from "./schedule/ScheduleSectionHeader";
export { WorkingHours } from "./schedule/WorkingHours";
export { BreakTime } from "./schedule/BreakTime";

// Table configuration
export { getDoctorsColumns } from "./columns/doctors-table.config";
