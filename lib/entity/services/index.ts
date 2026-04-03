/**
 * Services Entity Types
 *
 * Type definitions for clinic service catalog entities
 */

/**
 * Service type classification
 */
export type ServiceType = "TREATMENT" | "PROCEDURE" | "PRODUCT" | "ADVANCE";

/**
 * How the service is rendered on the odontogram
 */
export type OdontogramSymbolMode = "NONE" | "ASSET" | "TEXT" | "MANUAL";

/**
 * Service entity - Full representation
 */
export interface Service {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  description?: string;
  type: ServiceType;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode: OdontogramSymbolMode;
  /** Cloudinary public ID for ASSET mode */
  symbolPublicId?: string;
  /** Resolved URL for the symbol asset */
  symbolUrl?: string;
  /** Short text rendered on the tooth for TEXT mode */
  symbolText?: string;
  active: boolean;
  createAt?: string;
  updatedAt?: string;
}

/**
 * Service list item - Simplified for table display
 */
export interface ServiceListItem {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  type: ServiceType;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode?: OdontogramSymbolMode;
  symbolPublicId?: string;
  symbolUrl?: string;
  symbolText?: string;
  active: boolean;
  createAt?: string;
}

/**
 * Create service request payload
 */
export interface CreateServiceRequest {
  code: string;
  name: string;
  description?: string;
  type: ServiceType;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode: OdontogramSymbolMode;
  /** Base64 data URI of the symbol image for upload (ASSET mode) */
  symbolImage?: string;
  symbolText?: string;
}

/**
 * Update service request payload
 */
export type UpdateServiceRequest = Partial<CreateServiceRequest> & {
  id: string;
  active?: boolean;
};

/**
 * Query parameters for services list
 */
export interface ServicesQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

/**
 * Paginated services response
 */
export interface PaginatedServicesResponse {
  entities: ServiceListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Lightweight snapshot embedded in clinical events and appointments
 */
export interface ServiceSnapshot {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCost: number;
  serviceSymbolMode?: OdontogramSymbolMode;
  serviceSymbolUrl?: string;
  serviceSymbolText?: string;
}

/**
 * Service type labels (Spanish)
 */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  TREATMENT: "Tratamiento",
  PROCEDURE: "Procedimiento",
  PRODUCT: "Producto",
  ADVANCE: "Avance",
};

/**
 * Odontogram symbol mode labels (Spanish)
 */
export const SYMBOL_MODE_LABELS: Record<OdontogramSymbolMode, string> = {
  NONE: "Ninguno",
  ASSET: "Imagen",
  TEXT: "Texto",
  MANUAL: "Manual",
};
