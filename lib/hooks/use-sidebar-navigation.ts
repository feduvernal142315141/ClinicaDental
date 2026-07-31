"use client";

import { useMemo } from "react";
import {
  Calendar,
  Users,
  Settings,
  LayoutDashboard,
  Sliders,
  UserCog,
  Shield,
  Briefcase,
  Tag,
  IdCard,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { usePermission } from "./use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  children?: MenuItem[];
}

export interface MenuGroups {
  main: MenuItem[];
  secondary: MenuItem[];
}

/**
 * Navegación lateral derivada de PERMISOS, no del nombre del rol.
 *
 * Antes el menú se armaba con un `switch` sobre "admin" | "doctor" | "patient".
 * Como `normalizeRoleName` (auth-context) colapsa cualquier rol desconocido a
 * "doctor", a un rol a medida (asistente, recepción…) se le pintaba el menú de
 * doctor — Dashboard incluido — y al abrirlo el backend respondía 403 porque su
 * rol no tiene `reports`. Ahora cada entrada declara el módulo de permiso que
 * exige su pantalla, tomado de los `@PreAuthorize` del backend:
 *
 * | Ruta                  | Permiso backend                                    |
 * |-----------------------|----------------------------------------------------|
 * | /dashboard            | `reports`         (DashboardController)             |
 * | /patients             | `patients`        (PatientController)               |
 * | /appointments         | `appointments`    (AppointmentController)           |
 * | /settings/general     | `general_option`  (ClinicGeneralSettingsController)  |
 * | /settings/doctors     | `doctor`          (DoctorController)                |
 * | /settings/user-types  | `doctor`          (UserTypeController)               |
 * | /settings/roles       | `role`            (RoleController)                  |
 * | /settings/services    | `service`         (ServiceController)               |
 * | /settings/labels      | `appointments`    (LabelController)                 |
 *
 * Esto solo OCULTA opciones: quien decide sigue siendo el backend.
 */
export function useSidebarNavigation() {
  const { can, isAdmin } = usePermission();

  return useMemo(() => {
    /**
     * El backend concede la autoridad del módulo (p. ej. `patients`) cuando el
     * rol tiene ese módulo con CUALQUIER acción, sin mirar el bitmask. Aquí se
     * replica con el mismo OR de las cuatro acciones que ya usa la página de
     * citas.
     */
    const hasModule = (moduleKey: string): boolean =>
      isAdmin ||
      can(moduleKey, PermissionAction.CREATE) ||
      can(moduleKey, PermissionAction.EDIT) ||
      can(moduleKey, PermissionAction.DELETE) ||
      can(moduleKey, PermissionAction.BLOCK);

    const settingsChildren: MenuItem[] = (
      [
        { path: "/settings/general", label: "Opciones Generales", icon: Sliders, module: "general_option" },
        { path: "/settings/doctors", label: "Usuarios", icon: UserCog, module: "doctor" },
        { path: "/settings/user-types", label: "Tipos de usuario", icon: IdCard, module: "doctor" },
        { path: "/settings/roles", label: "Roles", icon: Shield, module: "role" },
        // MVP: notificaciones e integraciones ocultas hasta post-MVP
        { path: "/settings/services", label: "Servicios", icon: Briefcase, module: "service" },
        { path: "/settings/labels", label: "Etiquetas", icon: Tag, module: "appointments" },
      ] satisfies (MenuItem & { module: string })[]
    )
      .filter((item) => hasModule(item.module))
      .map(({ path, label, icon }) => ({ path, label, icon }));

    const main: MenuItem[] = [];

    if (hasModule("reports")) {
      main.push({ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
    }
    if (hasModule("patients")) {
      main.push({ path: "/patients", label: "Pacientes", icon: Users });
    }
    if (hasModule("appointments")) {
      main.push({ path: "/appointments", label: "Citas", icon: Calendar });
    }
    // El grupo Configuración solo aparece si le queda algún hijo visible.
    if (settingsChildren.length > 0) {
      main.push({
        path: "/settings",
        label: "Configuración",
        icon: Settings,
        children: settingsChildren,
      });
    }

    const isActiveRoute = (currentPath: string, itemPath: string): boolean => {
      if (!currentPath) return false;
      if (itemPath === "/") {
        return currentPath === "/";
      }
      return currentPath.startsWith(itemPath);
    };

    return {
      mainMenuItems: main,
      secondaryMenuItems: [] as MenuItem[],
      isActiveRoute,
    };
  }, [can, isAdmin]);
}
