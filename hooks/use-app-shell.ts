import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSidebarNavigation } from "./use-sidebar-navigation";
import {
  isPublicRoute,
  DEFAULT_LOGOUT_REDIRECT,
} from "@/lib/constants/routes.constants";

/**
 * useAppShell Hook
 *
 * Manages the application shell state and navigation logic
 * Provides all necessary state and handlers for the AppShell component
 */
export function useAppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Check if current route is public (no shell needed)
  const isPublic = isPublicRoute(pathname);

  // Get user information with fallbacks
  const userRole = user?.roleName || "admin";
  const userName = user?.email?.split("@")[0] || "Usuario";
  const userEmail = user?.email || "";

  // Get navigation items based on user role
  const { mainMenuItems, secondaryMenuItems } = useSidebarNavigation(userRole);

  /**
   * Navigate to a specific path
   */
  const handleNavigate = (path: string) => {
    router.push(path);
  };

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    await logout();
    router.push(DEFAULT_LOGOUT_REDIRECT);
  };

  /**
   * Navigate to user profile
   */
  const handleProfile = () => {
    router.push("/settings/profile");
  };

  /**
   * Navigate to support page
   */
  const handleSupport = () => {
    router.push("/support");
  };

  /**
   * Toggle sidebar collapsed state
   */
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  /**
   * Open mobile drawer
   */
  const openMobileDrawer = () => {
    setMobileDrawerOpen(true);
  };

  /**
   * Close mobile drawer
   */
  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };

  return {
    // State
    sidebarCollapsed,
    mobileDrawerOpen,
    pathname,
    isPublic,

    // User info
    userRole,
    userName,
    userEmail,

    // Navigation
    mainMenuItems,
    secondaryMenuItems,

    // Handlers
    handleNavigate,
    handleLogout,
    handleProfile,
    handleSupport,
    toggleSidebar,
    openMobileDrawer,
    closeMobileDrawer,
    setSidebarCollapsed,
  };
}
