/**
 * Roles Constants
 *
 * Constants and configuration for roles module
 */

/**
 * System predefined role IDs
 */
export const SYSTEM_ROLE_IDS = {
  SUPER_ADMIN: "11111111-1111-1111-1111-111111111111",
  ADMIN: "22222222-2222-2222-2222-222222222222",
  DOCTOR: "33333333-3333-3333-3333-333333333333",
} as const;

/**
 * System predefined role names
 */
export const SYSTEM_ROLE_NAMES = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  DOCTOR: "Doctor",
} as const;

/**
 * Permission categories
 */
export const PERMISSION_CATEGORIES = {
  APPOINTMENTS: "appointments",
  PATIENTS: "patients",
  CLINICAL: "clinical",
  DOCTORS: "doctors",
  SETTINGS: "settings",
  REPORTS: "reports",
} as const;

/**
 * Available permissions
 */
export const PERMISSIONS = {
  // Nota: este catálogo define qué módulos se renderizan en el selector.
  // Debe estar alineado con los `name` que devuelve GET /permissions.
  APPOINTMENTS: {
    id: "appointments",
    name: "Citas",
    description: "Gestión de citas",
    category: PERMISSION_CATEGORIES.APPOINTMENTS,
  },
  PATIENTS: {
    id: "patients",
    name: "Pacientes",
    description: "Gestión de pacientes",
    category: PERMISSION_CATEGORIES.PATIENTS,
  },
  PATIENT_MANAGEMENT: {
    id: "patient_management",
    name: "Administración de Pacientes",
    description: "Operaciones administrativas de pacientes",
    category: PERMISSION_CATEGORIES.PATIENTS,
  },
  DOCTOR: {
    id: "doctor",
    name: "Doctores",
    description: "Gestión de doctores",
    category: PERMISSION_CATEGORIES.DOCTORS,
  },
  ROLE: {
    id: "role",
    name: "Roles",
    description: "Gestión de roles y permisos",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  CAMPAIGN: {
    id: "campaign",
    name: "Campañas",
    description: "Gestión de campañas",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  TEMPLATE: {
    id: "template",
    name: "Plantillas",
    description: "Gestión de plantillas",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  GENERAL_OPTION: {
    id: "general_option",
    name: "Opciones Generales",
    description: "Configuraciones generales",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  NOTIFICATION: {
    id: "notification",
    name: "Notificaciones",
    description: "Gestión de notificaciones",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  INTEGRATION: {
    id: "integration",
    name: "Integraciones",
    description: "Gestión de integraciones",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  SERVICE: {
    id: "service",
    name: "Servicios",
    description: "Gestión de servicios clínicos",
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  CLINICAL_HISTORY: {
    id: "clinical_history",
    name: "Historia Clínica",
    description: "Gestión de historia clínica",
    category: PERMISSION_CATEGORIES.CLINICAL,
  },
} as const;

/**
 * Role validation rules
 */
export const ROLE_VALIDATION = {
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 50,
  MIN_PERMISSIONS: 0,
  MAX_PERMISSIONS: 20,
} as const;

/**
 * Default pagination settings for roles
 */
export const ROLES_PAGINATION_DEFAULTS = {
  PAGE: 0,
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

/**
 * Filter operators for roles queries
 */
export const FILTER_OPERATORS = {
  EQUAL: "eq",
  NOT_EQUAL: "ne",
  CONTAINS: "contains",
  STARTS_WITH: "startsWith",
  ENDS_WITH: "endsWith",
  GREATER_THAN_OR_EQUAL: "gte",
  LESS_THAN_OR_EQUAL: "lte",
} as const;

/**
 * Sort directions
 */
export const SORT_DIRECTIONS = {
  ASCENDING: "asc",
  DESCENDING: "desc",
} as const;

/**
 * Role colors for UI display
 */
export const ROLE_COLORS = {
  SUPER_ADMIN: "#ff4d4f", // Red
  ADMIN: "#1890ff", // Blue
  DOCTOR: "#52c41a", // Green
  DEFAULT: "#8c8c8c", // Gray
} as const;

/**
 * Role status messages
 */
export const ROLE_MESSAGES = {
  CREATE_SUCCESS: "Rol creado exitosamente",
  CREATE_ERROR: "Error al crear rol",
  LOAD_ERROR: "Error al cargar roles",
  LOAD_DETAIL_ERROR: "Error al cargar detalle del rol",
  VALIDATION_ERROR: "Error de validación en los datos del rol",
  EMPTY_NAME: "El nombre del rol no puede estar vacío",
} as const;
