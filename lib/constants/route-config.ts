import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  HelpCircle,
  BookImage,
  FileText,
  User,
  Bell,
  Shield,
  Palette,
  UserCog,
  Sliders,
  Link,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface RouteConfig {
  label: string;
  icon?: LucideIcon;
  /** If true, this segment represents a dynamic ID that needs resolution */
  isDynamic?: boolean;
  /** Parent route for nested breadcrumbs */
  parent?: string;
}

/**
 * Centralized route configuration map
 * Maps path segments to their display labels and icons
 *
 * For dynamic routes like /patients/[id], use a placeholder key
 * The actual ID will be resolved by the breadcrumb hook
 */
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // Main routes
  dashboard: {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  patients: {
    label: "Pacientes",
    icon: Users,
  },
  appointments: {
    label: "Citas",
    icon: Calendar,
  },
  campaigns: {
    label: "Campañas",
    icon: BookImage,
  },
  "template-demo": {
    label: "Templates",
    icon: FileText,
  },
  settings: {
    label: "Configuración",
    icon: Settings,
  },
  support: {
    label: "Soporte",
    icon: HelpCircle,
  },

  // Nested routes - Settings
  general: {
    label: "Opciones Generales",
    icon: Sliders,
    parent: "settings",
  },
  "patient-management": {
    label: "Gestión de Pacientes",
    icon: Users,
    parent: "settings",
  },
  profile: {
    label: "Perfil",
    icon: User,
    parent: "settings",
  },
  notifications: {
    label: "Notificaciones",
    icon: Bell,
    parent: "settings",
  },
  security: {
    label: "Seguridad",
    icon: Shield,
    parent: "settings",
  },
  appearance: {
    label: "Apariencia",
    icon: Palette,
    parent: "settings",
  },
  users: {
    label: "Doctores y Roles",
    icon: UserCog,
    parent: "settings",
  },
  integrations: {
    label: "Integraciones",
    icon: Link,
    parent: "settings",
  },

  // Action routes
  new: {
    label: "Nuevo",
  },
  create: {
    label: "Nuevo",
  },
  edit: {
    label: "Editar",
  },
  details: {
    label: "Detalles",
  },
};

/**
 * Check if a path segment looks like a dynamic ID
 * UUIDs, MongoDB ObjectIds, or numeric IDs
 */
export function isDynamicSegment(segment: string): boolean {
  // UUID pattern
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // MongoDB ObjectId pattern
  const objectIdPattern = /^[0-9a-f]{24}$/i;
  // Numeric ID
  const numericPattern = /^\d+$/;

  return (
    uuidPattern.test(segment) ||
    objectIdPattern.test(segment) ||
    numericPattern.test(segment)
  );
}

/**
 * Get the label for a route segment
 * Returns the configured label or formats the segment as fallback
 */
export function getRouteLabel(segment: string): string {
  const config = ROUTE_CONFIG[segment.toLowerCase()];
  if (config) {
    return config.label;
  }

  // Fallback: capitalize and replace dashes with spaces
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get the icon for a route segment
 */
export function getRouteIcon(segment: string): LucideIcon | undefined {
  const config = ROUTE_CONFIG[segment.toLowerCase()];
  return config?.icon;
}
