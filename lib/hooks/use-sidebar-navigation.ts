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
  MessageSquare,
  Megaphone,
  Filter,
  FileText,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { usePermission } from "./use-permission";
import { useI18n } from "@/lib/contexts/i18n-context";
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
 * | Ruta                       | Permiso backend                                    |
 * |----------------------------|----------------------------------------------------|
 * | /dashboard                 | visible para todo autenticado                      |
 * | /patients                  | `patients`        (PatientController)               |
 * | /appointments              | `appointments`    (AppointmentController)           |
 * | /inbox                     | `whatsapp_inbox`  (InboxController)                 |
 * | /growth/campaigns          | `campaign`        (GrowthCampaignController)        |
 * | /growth/segments           | `campaign`        (PatientSegmentController)        |
 * | /settings/notifications    | `notification`    (plantillas + recordatorios)      |
 * | /settings/general          | `general_option`  (ClinicGeneralSettingsController) |
 * | /settings/doctors          | `doctor`          (DoctorController)                |
 * | /settings/user-types       | `doctor`          (UserTypeController)              |
 * | /settings/roles            | `role`            (RoleController)                  |
 * | /settings/services         | `service`         (ServiceController)               |
 * | /settings/labels           | `appointments`    (LabelController)                 |
 */
export function useSidebarNavigation() {
  const { can, isAdmin } = usePermission();
  const { t } = useI18n();

  return useMemo(() => {
    const hasModule = (moduleKey: string): boolean =>
      isAdmin ||
      can(moduleKey, PermissionAction.CREATE) ||
      can(moduleKey, PermissionAction.EDIT) ||
      can(moduleKey, PermissionAction.DELETE) ||
      can(moduleKey, PermissionAction.BLOCK);

    // ── Comunicación ────────────────────────────────────────────────────────
    // Agrupa Bandeja, Campañas, Segmentos y Plantillas bajo un solo menú.
    const comunicacionChildren: MenuItem[] = [];

    if (hasModule("whatsapp_inbox")) {
      comunicacionChildren.push({ path: "/inbox", label: "Bandeja", icon: MessageSquare });
    }
    if (hasModule("campaign")) {
      comunicacionChildren.push({ path: "/growth/campaigns", label: "Campañas", icon: Megaphone });
      comunicacionChildren.push({ path: "/growth/segments", label: "Segmentos", icon: Filter });
    }
    if (hasModule("notification")) {
      comunicacionChildren.push({ path: "/settings/notifications", label: "Plantillas", icon: FileText });
    }

    // ── Configuración ───────────────────────────────────────────────────────
    const settingsChildren: MenuItem[] = (
      [
        { path: "/settings/general", label: t("navigation.generalSettings"), icon: Sliders, module: "general_option" },
        { path: "/settings/doctors", label: t("navigation.users"), icon: UserCog, module: "doctor" },
        { path: "/settings/user-types", label: t("navigation.userTypes"), icon: IdCard, module: "doctor" },
        { path: "/settings/roles", label: t("navigation.roles"), icon: Shield, module: "role" },
        { path: "/settings/services", label: t("navigation.services"), icon: Briefcase, module: "service" },
        { path: "/settings/labels", label: t("navigation.labels"), icon: Tag, module: "appointments" },
      ] satisfies (MenuItem & { module: string })[]
    )
      .filter((item) => hasModule(item.module))
      .map(({ path, label, icon }) => ({ path, label, icon }));

    // ── Menú principal ──────────────────────────────────────────────────────
    const main: MenuItem[] = [];

    main.push({ path: "/dashboard", label: t("navigation.dashboard"), icon: LayoutDashboard });

    if (hasModule("patients")) {
      main.push({ path: "/patients", label: t("navigation.patients"), icon: Users });
    }
    if (hasModule("appointments")) {
      main.push({ path: "/appointments", label: t("navigation.appointments"), icon: Calendar });
    }

    // Comunicación: solo aparece si tiene al menos un hijo visible.
    if (comunicacionChildren.length > 0) {
      main.push({
        path: "/inbox",
        label: "Comunicación",
        icon: MessageSquare,
        children: comunicacionChildren,
      });
    }

    // Configuración: solo aparece si tiene al menos un hijo visible.
    if (settingsChildren.length > 0) {
      main.push({
        path: "/settings",
        label: t("navigation.settings"),
        icon: Settings,
        children: settingsChildren,
      });
    }

    const isActiveRoute = (currentPath: string, itemPath: string): boolean => {
      if (!currentPath) return false;
      if (itemPath === "/") {
        return currentPath === "/";
      }
      return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
    };

    return {
      mainMenuItems: main,
      secondaryMenuItems: [] as MenuItem[],
      isActiveRoute,
    };
  }, [can, isAdmin, t]);
}
