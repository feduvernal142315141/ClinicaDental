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
 * Dental service category for odontogram integration
 */
export type ServiceCategory =
  | "DIAGNOSTICO"
  | "PREVENTIVO"
  | "RESTAURADOR"
  | "ENDODONCIA"
  | "PERIODONCIA"
  | "PROTESIS"
  | "IMPLANTE"
  | "CIRUGIA"
  | "ORTODONCIA"
  | "ESTETICO"
  | "GENERAL";

/**
 * Service entity - Full representation
 */
export interface Service {
  id: string;
  clinicId?: string;
  code: string;
  name: string;
  type: ServiceType;
  category?: ServiceCategory;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode: OdontogramSymbolMode;
  /** Cloudinary public ID for ASSET mode */
  symbolPublicId?: string;
  /** Resolved URL for the symbol asset */
  symbolUrl?: string;
  /** Short text rendered on the tooth for TEXT mode */
  symbolText?: string;
  /** Duration in minutes */
  duration?: number;
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
  category?: ServiceCategory;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode?: OdontogramSymbolMode;
  symbolPublicId?: string;
  symbolUrl?: string;
  symbolText?: string;
  /** Duration in minutes */
  duration?: number;
  active: boolean;
  createAt?: string;
}

/**
 * Create service request payload
 */
export interface CreateServiceRequest {
  code: string;
  name: string;
  type: ServiceType;
  category?: ServiceCategory;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode: OdontogramSymbolMode;
  /** Base64 data URI of the symbol image for upload (ASSET mode) */
  symbolImage?: string;
  symbolText?: string;
  /** Default duration in minutes (drives appointment block sizing) */
  duration?: number;
}

/**
 * Update service request payload.
 *
 * `active` NO viaja aquí: el estado se conmuta por su propio endpoint
 * (`PATCH /services/{id}/toggle-status`) y el UpdateServiceCommand del backend
 * no tiene ese campo.
 */
export type UpdateServiceRequest = Partial<CreateServiceRequest> & {
  id: string;
};

/**
 * Payload de `PATCH /services/{id}/odontogram-visibility`.
 *
 * `odontogramEnabled` es LA regla que decide dónde se planifica el servicio:
 * `true` → diente a diente en el odontograma; `false` → servicio "general"
 * (limpieza, radiografía, consulta), que se planifica a nivel paciente.
 */
export interface SetOdontogramVisibilityRequest {
  odontogramEnabled: boolean;
}

/**
 * Query parameters for services list.
 *
 * ÚNICA ruta soportada por `GET /services`: el controller solo declara
 * `filters`/`orders`/`page`/`pageSize`. Cualquier otro query param (`q`,
 * `active`, `odontogramEnabled`, `sort`) lo DESCARTA Spring en silencio, por
 * eso no existe aquí. Los strings de `filters`/`orders` se construyen con
 * `servicesQuery()` (`lib/query/domains/services.ts`), nunca a mano.
 */
export interface ServicesQueryParams {
  page?: number;
  pageSize?: number;
  /** Dialecto services: `campo__OPERADOR__valor__AND` */
  filters?: string[];
  /** `campo__ASC` / `campo__DESC` */
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
  /** Frozen default duration (minutes) for historical reproducibility */
  serviceDuration?: number;
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

/**
 * Service category labels (Spanish)
 */
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  DIAGNOSTICO: "Diagnóstico",
  PREVENTIVO: "Preventivo",
  RESTAURADOR: "Restaurador",
  ENDODONCIA: "Endodoncia",
  PERIODONCIA: "Periodoncia",
  PROTESIS: "Prótesis",
  IMPLANTE: "Implante",
  CIRUGIA: "Cirugía",
  ORTODONCIA: "Ortodoncia",
  ESTETICO: "Estético",
  GENERAL: "General",
};

/**
 * Service types that can be booked into the agenda (visit codes).
 * PRODUCT/ADVANCE are non-visit codes: sellable but not schedulable.
 */
export const SCHEDULABLE_SERVICE_TYPES: ServiceType[] = ["TREATMENT", "PROCEDURE"];

export function isSchedulableType(type: ServiceType): boolean {
  return SCHEDULABLE_SERVICE_TYPES.includes(type);
}
