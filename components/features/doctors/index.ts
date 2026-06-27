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

// Componentes aún usados por otras vistas (perfil, modal de contraseña, otros forms)
export { SecurityFields } from "./form/fields/SecurityFields";
export { RoleStatusFields } from "./form/fields/RoleStatusFields";
export { FormActions } from "./form/components/FormActions";
export { PasswordStrength } from "../../ui/PasswordStrength";
export { AvatarUpload } from "./form/components/AvatarUpload";

// Table configuration
export { getDoctorsColumns } from "./columns/doctors-table.config";
