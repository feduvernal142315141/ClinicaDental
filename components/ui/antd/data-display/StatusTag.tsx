"use client";

import { Tag, TagProps } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";

export type StatusType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "processing"
  | "default";

export interface StatusTagProps extends Omit<TagProps, "color" | "icon"> {
  /** Status type determines color and icon */
  status: StatusType;
  /** Text to display */
  text: string;
  /** Show icon */
  showIcon?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
}

const STATUS_CONFIG: Record<
  StatusType,
  { color: string; icon: React.ReactNode }
> = {
  success: { color: "success", icon: <CheckCircleOutlined /> },
  error: { color: "error", icon: <CloseCircleOutlined /> },
  warning: { color: "warning", icon: <ExclamationCircleOutlined /> },
  info: { color: "processing", icon: <ClockCircleOutlined /> },
  processing: { color: "processing", icon: <SyncOutlined spin /> },
  default: { color: "default", icon: null },
};

/**
 * Ant Design Status Tag component
 * Displays status with consistent colors and icons
 *
 * @example
 * <StatusTag status="success" text="Activo" />
 * <StatusTag status="error" text="Inactivo" showIcon />
 */
export function StatusTag({
  status,
  text,
  showIcon = false,
  icon,
  ...props
}: StatusTagProps) {
  const config = STATUS_CONFIG[status];
  const displayIcon = icon ?? (showIcon ? config.icon : null);

  return (
    <Tag color={config.color} icon={displayIcon} {...props}>
      {text}
    </Tag>
  );
}

/**
 * Preset for active/inactive status
 */
export function ActiveStatusTag({ active }: { active: boolean }) {
  return (
    <StatusTag
      status={active ? "success" : "error"}
      text={active ? "Activo" : "Inactivo"}
      showIcon
    />
  );
}
