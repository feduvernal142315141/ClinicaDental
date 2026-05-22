"use client";

import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

type SpinSize = "small" | "medium" | "large";

export interface LoadingSpinnerProps {
  /** Loading message to display */
  description?: string;
  /** Size of the spinner */
  size?: SpinSize;
  /** Additional CSS class */
  className?: string;
  /** Whether to cover the full page */
  fullPage?: boolean;
  /** Whether to show as overlay with content behind */
  overlay?: boolean;
  /** Content to wrap (for overlay mode) */
  children?: React.ReactNode;
}

/**
 * Ant Design Loading Spinner component
 *
 * @example Basic
 * ```tsx
 * <LoadingSpinner description="Cargando..." />
 * ```
 *
 * @example Full page
 * ```tsx
 * <LoadingSpinner description="Cargando aplicación..." fullPage size="large" />
 * ```
 *
 * @example As overlay
 * ```tsx
 * <LoadingSpinner description="Guardando..." overlay>
 *   <YourContent />
 * </LoadingSpinner>
 * ```
 */
export function LoadingSpinner({
  description = "Cargando...",
  size = "medium",
  className,
  fullPage = false,
  overlay = false,
  children,
}: LoadingSpinnerProps) {
  const antIcon = (
    <LoadingOutlined
      style={{
        fontSize: size === "small" ? 24 : size === "large" ? 48 : 32,
      }}
      spin
    />
  );

  // Full page loading - use fullscreen mode for description to work
  if (fullPage) {
    return (
      <Spin fullscreen indicator={antIcon} description={description} size={size} />
    );
  }

  // Overlay mode - wraps content (nested pattern, description works here)
  if (overlay && children) {
    return (
      <Spin
        indicator={antIcon}
        description={description}
        size={size}
        spinning={true}
        className={className}
      >
        {children}
      </Spin>
    );
  }

  // Simple inline spinner - wrap with empty div for description to work (nested pattern)
  return (
    <div className={`flex items-center justify-center p-8 ${className || ""}`}>
      <Spin indicator={antIcon} description={description} size={size}>
        <div style={{ padding: "50px" }} />
      </Spin>
    </div>
  );
}
