"use client";

import { Breadcrumb as AntBreadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/lib/hooks/use-breadcrumb";
import { createElement } from "react";

interface AppBreadcrumbProps {
  /**
   * Optional map to resolve dynamic IDs to display names
   * e.g., { "patient-123": "Juan Pérez" }
   */
  dynamicLabels?: Record<string, string>;
  /**
   * Custom separator between items
   * @default "/"
   */
  separator?: React.ReactNode;
  /**
   * Additional CSS class
   */
  className?: string;
}

/**
 * Ant Design Breadcrumb component with automatic route detection
 *
 * Features:
 * - Automatically generates breadcrumbs from current pathname
 * - Supports dynamic route segments (IDs) with custom labels
 * - Integrates with route configuration for consistent labels
 * - Clickable navigation to parent routes
 *
 * @example
 * // Basic usage - fully automatic
 * <AppBreadcrumb />
 *
 * @example
 * // With dynamic label for patient detail page
 * <AppBreadcrumb
 *   dynamicLabels={{
 *     [patientId]: patient?.name || "Cargando..."
 *   }}
 * />
 */
export function AppBreadcrumb({
  dynamicLabels,
  separator = "/",
  className,
}: AppBreadcrumbProps) {
  const router = useRouter();
  const { items } = useBreadcrumb({ dynamicLabels });

  // Don't render if there are no items at all
  if (items.length === 0) {
    return null;
  }

  const breadcrumbItems = items.map((item, index) => {
    const isLast = index === items.length - 1;

    // Build the title with optional icon
    const title = (
      <span className="flex items-center gap-1.5">
        {item.icon &&
          index === 0 &&
          (item.segment === "" ? (
            <HomeOutlined />
          ) : (
            createElement(item.icon, { size: 14 })
          ))}
        <span>{item.label}</span>
      </span>
    );

    return {
      key: item.href,
      title,
      href: isLast ? undefined : item.href,
      onClick: isLast
        ? undefined
        : (e: React.MouseEvent) => {
            e.preventDefault();
            router.push(item.href);
          },
      className: isLast ? "text-foreground font-medium" : "cursor-pointer",
    };
  });

  return (
    <AntBreadcrumb
      items={breadcrumbItems}
      separator={separator}
      className={className}
    />
  );
}
