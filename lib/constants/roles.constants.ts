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
  FINANCE: "finance",
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
    // Nota: el backend define esta autoridad como "patient management" (con
    // espacio, no guion bajo) — ver Permissions.java. El id debe coincidir
    // exactamente porque el claim del JWT usa `${name}-${actionsBitmask}`.
    id: "patient management",
    name: "Administración de Pacientes",
    description: "Operaciones administrativas de pacientes",
    category: PERMISSION_CATEGORIES.PATIENTS,
  },
  DOCTOR: {
    id: "doctor",
    name: "Usuarios",
    description: "Gestión de usuarios",
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
  ODONTOGRAM: {
    id: "odontogram",
    name: "Odontograma",
    description: "Gestión del odontograma clínico",
    category: PERMISSION_CATEGORIES.CLINICAL,
  },
  REPORTS: {
    id: "reports",
    name: "Reportes",
    description: "Acceso a reportes y dashboard administrativo",
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  // ── Finanzas: 4 módulos (docs/finance/frontend-prompt.md §3) ──────────
  // `actions` restringe y renombra las columnas del selector de roles.
  BILLING: {
    id: "billing",
    name: "Finanzas",
    description: "Ver finanzas, cobrar, emitir recibos, presupuestos y cargos",
    category: PERMISSION_CATEGORIES.FINANCE,
    actions: [
      { action: 1, label: "Cobrar y emitir" },
      { action: 2, label: "Editar" },
      { action: 8, label: "Anular" },
    ],
  },
  BILLING_ADJUST: {
    id: "billing_adjust",
    name: "Ajustes de Finanzas",
    description: "Aplicar descuentos y devolver dinero",
    category: PERMISSION_CATEGORIES.FINANCE,
    actions: [
      { action: 1, label: "Descuentos" },
      { action: 4, label: "Devoluciones" },
    ],
  },
  BILLING_CASH: {
    id: "billing_cash",
    name: "Caja",
    description: "Abrir y cerrar caja; historial de cajas",
    category: PERMISSION_CATEGORIES.FINANCE,
    actions: [
      { action: 1, label: "Abrir caja" },
      { action: 2, label: "Cerrar caja" },
    ],
  },
  BILLING_REPORTS: {
    id: "billing_reports",
    name: "Reportes de Finanzas",
    description: "Caja del día, por cobrar y dashboard",
    category: PERMISSION_CATEGORIES.FINANCE,
    actions: [{ action: 1, label: "Ver" }],
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
