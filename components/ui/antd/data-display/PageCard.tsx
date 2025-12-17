"use client";

import { Card as AntCard, CardProps as AntCardProps } from "antd";

export interface PageCardProps extends Omit<AntCardProps, "title"> {
  /** Card title */
  title?: React.ReactNode;
  /** Card subtitle/description */
  subtitle?: string;
  /** Extra content in header (right side) */
  extra?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Whether card is loading */
  loading?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Ant Design Page Card component
 * Wrapper for consistent card styling across pages
 *
 * @example
 * <PageCard
 *   title="Usuarios"
 *   subtitle="Gestión de usuarios del sistema"
 *   extra={<Button>Nuevo Usuario</Button>}
 * >
 *   <DataTable ... />
 * </PageCard>
 */
export function PageCard({
  title,
  subtitle,
  extra,
  children,
  loading = false,
  className,
  ...props
}: PageCardProps) {
  const cardTitle = title ? (
    <div className="flex flex-col">
      <span className="text-lg font-semibold">{title}</span>
      {subtitle && (
        <span className="text-sm text-gray-500 font-normal mt-1">
          {subtitle}
        </span>
      )}
    </div>
  ) : undefined;

  return (
    <AntCard
      title={cardTitle}
      extra={extra}
      loading={loading}
      className={className}
      {...props}
    >
      {children}
    </AntCard>
  );
}
