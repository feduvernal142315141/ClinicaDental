"use client";

import { Card as AntCard, CardProps as AntCardProps } from "antd";
import { CSSProperties, ReactNode } from "react";

export interface CardProps extends Omit<AntCardProps, "title"> {
  /** Card title */
  title?: ReactNode;
  /** Card subtitle/description below title */
  subtitle?: string;
  /** Extra content in header (right side) */
  extra?: ReactNode;
  /** Card content */
  children: ReactNode;
  /** Whether card is loading */
  loading?: boolean;
  /** Card variant (bordered or borderless) */
  variant?: "outlined" | "borderless";
  /** Whether card is hoverable */
  hoverable?: boolean;
  /** Card size */
  size?: "default" | "small";
  /** Additional CSS class */
  className?: string;
  /** Custom styles */
  style?: CSSProperties;
  /** Body style */
  bodyStyle?: CSSProperties;
  /** Header and body styles using new API */
  styles?: {
    header?: CSSProperties;
    body?: CSSProperties;
  };
  /** Actions in footer */
  actions?: ReactNode[];
  /** Card cover image/content */
  cover?: ReactNode;
}

/**
 * Generic Card Component
 *
 * Reusable and customizable Ant Design Card wrapper.
 * Perfect for wrapping content with consistent styling.
 *
 * @example
 * // Simple card
 * <Card title="Title">Content</Card>
 *
 * @example
 * // Card with subtitle and actions
 * <Card
 *   title="Doctors"
 *   subtitle="Manage system doctors"
 *   extra={<Button>New Doctor</Button>}
 * >
 *   <DataTable ... />
 * </Card>
 *
 * @example
 * // Hoverable card without border
 * <Card hoverable bordered={false}>
 *   <p>Content</p>
 * </Card>
 */
export function Card({
  title,
  subtitle,
  extra,
  children,
  loading = false,
  variant = "outlined",
  hoverable = false,
  size = "default",
  className,
  style,
  bodyStyle,
  styles,
  actions,
  cover,
  ...props
}: CardProps) {
  // Build title with subtitle if provided
  const cardTitle = title ? (
    <div className="flex flex-col gap-1">
      <div className="text-base font-semibold">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 font-normal">{subtitle}</div>
      )}
    </div>
  ) : undefined;

  // Default card styles with shadow
  const defaultStyles: CSSProperties = {
    boxShadow: "1px 3px 22px -9px rgba(0,0,0,0.75)",
    WebkitBoxShadow: "1px 3px 22px -9px rgba(0,0,0,0.75)",
    MozBoxShadow: "1px 3px 22px -9px rgba(0,0,0,0.75)",
    ...style,
  };

  // Merge bodyStyle with styles.body if provided
  const cardStyles = {
    header: styles?.header,
    body: { ...bodyStyle, ...styles?.body },
  };

  return (
    <AntCard
      title={cardTitle}
      extra={extra}
      loading={loading}
      variant={variant}
      hoverable={hoverable}
      size={size}
      className={className}
      style={defaultStyles}
      styles={cardStyles}
      actions={actions}
      cover={cover}
      {...props}
    >
      {children}
    </AntCard>
  );
}
