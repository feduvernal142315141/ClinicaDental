"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  ROUTE_CONFIG,
  isDynamicSegment,
  getRouteLabel,
  getRouteIcon,
} from "@/lib/constants/route-config";
import { LucideIcon } from "lucide-react";
import { Home } from "lucide-react";

export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Full path/href for navigation */
  href: string;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Whether this is the current/active item */
  isActive: boolean;
  /** Whether this item represents a dynamic ID */
  isDynamic: boolean;
  /** The raw path segment */
  segment: string;
}

interface UseBreadcrumbOptions {
  /**
   * Optional map to resolve dynamic IDs to display names
   * e.g., { "patient-123": "Juan Pérez" }
   */
  dynamicLabels?: Record<string, string>;
  /**
   * Whether to include the home/root item
   * @default true
   */
  includeHome?: boolean;
  /**
   * Custom home label
   * @default "Inicio"
   */
  homeLabel?: string;
}

/**
 * Hook to generate breadcrumb items from the current pathname
 *
 * @example
 * // Basic usage - automatic breadcrumbs
 * const { items } = useBreadcrumb();
 *
 * @example
 * // With dynamic label resolution
 * const { items } = useBreadcrumb({
 *   dynamicLabels: {
 *     [patientId]: patient?.name || "Cargando..."
 *   }
 * });
 */
export function useBreadcrumb(options: UseBreadcrumbOptions = {}) {
  const {
    dynamicLabels = {},
    includeHome = true,
    homeLabel = "Inicio",
  } = options;
  const pathname = usePathname();

  const items = useMemo<BreadcrumbItem[]>(() => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home item
    if (includeHome) {
      breadcrumbs.push({
        label: homeLabel,
        href: "/dashboard",
        icon: Home,
        isActive: pathname === "/dashboard" || pathname === "/",
        isDynamic: false,
        segment: "",
      });
    }

    // Split pathname and filter empty segments
    const segments = pathname.split("/").filter(Boolean);

    // Build breadcrumb items from path segments
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip dashboard segment if we already have the home item pointing to /dashboard
      if (includeHome && segment === "dashboard") {
        return;
      }

      const isLast = index === segments.length - 1;
      const isDynamic = isDynamicSegment(segment);

      // Determine the label
      let label: string;
      if (isDynamic && dynamicLabels[segment]) {
        // Use provided dynamic label
        label = dynamicLabels[segment];
      } else if (isDynamic) {
        // Fallback for dynamic segments without label
        label = "Detalle";
      } else {
        // Use route config or formatted segment
        label = getRouteLabel(segment);
      }

      // Get icon (only for non-dynamic segments)
      const icon = isDynamic ? undefined : getRouteIcon(segment);

      breadcrumbs.push({
        label,
        href: currentPath,
        icon,
        isActive: isLast,
        isDynamic,
        segment,
      });
    });

    return breadcrumbs;
  }, [pathname, dynamicLabels, includeHome, homeLabel]);

  return {
    items,
    pathname,
    /** Current page label (last item) */
    currentPage: items[items.length - 1]?.label || "",
    /** Whether we're at the root/home */
    isHome: pathname === "/dashboard" || pathname === "/",
  };
}
