import {
  Calendar,
  Users,
  Settings,
  Stethoscope,
  UserCheck,
  ClipboardList,
  BookImage,
  FileText,
  LayoutDashboard,
  HelpCircle,
  Sliders,
  UserCog,
  Bell,
  Link,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

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

type UserRole = "admin" | "doctor" | "patient";

export function useSidebarNavigation(userRole?: string) {
  const getMenuGroups = (): MenuGroups => {
    // Support and Settings are now in the global header; remove from sidebar
    const secondaryItems: MenuItem[] = [];

    // Settings sub-menu items
    const settingsChildren: MenuItem[] = [
      { path: "/settings/general", label: "Opciones Generales", icon: Sliders },
      {
        path: "/settings/patient-management",
        label: "Gestión de Pacientes",
        icon: Users,
      },
      { path: "/settings/doctors", label: "Doctores y Roles", icon: UserCog },
      { path: "/settings/notifications", label: "Notificaciones", icon: Bell },
      { path: "/settings/integrations", label: "Integraciones", icon: Link },
    ];

    switch (userRole as UserRole) {
      case "admin":
        return {
          main: [
            { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { path: "/patients", label: "Pacientes", icon: Users },
            { path: "/appointments", label: "Citas", icon: Calendar },
            { path: "/campaigns", label: "Campañas", icon: BookImage },
            { path: "/template-demo", label: "Templates", icon: FileText },
            {
              path: "/settings",
              label: "Configuración",
              icon: Settings,
              children: settingsChildren,
            },
          ],
          secondary: secondaryItems,
        };
      case "doctor":
        return {
          main: [
            { path: "/dashboard", label: "Dashboard", icon: Stethoscope },
            { path: "/appointments", label: "Mis Citas", icon: Calendar },
            { path: "/patients", label: "Pacientes", icon: UserCheck },
          ],
          secondary: secondaryItems,
        };
      case "patient":
        return {
          main: [
            { path: "/dashboard", label: "Dashboard", icon: UserCheck },
            { path: "/appointments", label: "Mis Citas", icon: Calendar },
            { path: "/history", label: "Historial", icon: ClipboardList },
          ],
          secondary: secondaryItems,
        };
      default:
        return { main: [], secondary: [] };
    }
  };

  const isActiveRoute = (currentPath: string, itemPath: string): boolean => {
    if (!currentPath) return false;
    if (itemPath === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(itemPath);
  };

  const menuGroups = getMenuGroups();

  return {
    mainMenuItems: menuGroups.main,
    secondaryMenuItems: menuGroups.secondary,
    isActiveRoute,
  };
}
