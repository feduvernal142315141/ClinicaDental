"use client";

import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

type SpinSize = "small" | "default" | "large";

export interface LoadingSpinnerProps {
  /** Loading message to display */
  tip?: string;
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
 * <LoadingSpinner tip="Cargando..." />
 * ```
 *
 * @example Full page
 * ```tsx
 * <LoadingSpinner tip="Cargando aplicación..." fullPage size="large" />
 * ```
 *
 * @example As overlay
 * ```tsx
 * <LoadingSpinner tip="Guardando..." overlay>
 *   <YourContent />
 * </LoadingSpinner>
 * ```
 */
export function LoadingSpinner({
  tip = "Cargando...",
  size = "default",
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

  // Full page loading - use fullscreen mode for tip to work
  if (fullPage) {
    return <Spin fullscreen indicator={antIcon} tip={tip} size={size} />;
  }

  // Overlay mode - wraps content (nested pattern, tip works here)
  if (overlay && children) {
    return (
      <Spin
        indicator={antIcon}
        tip={tip}
        size={size}
        spinning={true}
        className={className}
      >
        {children}
      </Spin>
    );
  }

  // Simple inline spinner - wrap with empty div for tip to work (nested pattern)
  return (
    <div className={`flex items-center justify-center p-8 ${className || ""}`}>
      <Spin indicator={antIcon} tip={tip} size={size}>
        <div style={{ padding: "50px" }} />
      </Spin>
    </div>
  );
}
