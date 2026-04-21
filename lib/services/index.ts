/**
 * Exports centralizados de los servicios
 */

// Servicios base (GET, POST, PUT, DELETE, PATCH)
export {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
  servicePatch,
} from "./baseService";

// Instancia de Axios y configuración de interceptores
export { default as apiInstance, setInterceptorHandlers } from "./apiConfig";

// Configuraciones predefinidas de interceptores
export {
  setupInterceptorsBasic,
  setupInterceptorsWithAlertContext,
  setupInterceptorsWithLoading,
  setupInterceptorsHybrid,
} from "./interceptors-setup";

// Doctors Services (replaces manager-users)
export * from "./doctors";

// Patients Services
export * from "./patients";

// Appointments Services
export * from "./appointments";

// Dashboard Services
export * from "./dashboard";

// Odontogram & Treatment-Plan Services
export * from "./odontogram";

// Types
export type { ResponseEntity, ServiceResponse } from "../models/response";
