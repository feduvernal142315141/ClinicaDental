"use client";

import { Dropdown, Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import type { MenuProps } from "antd";
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
} from "@ant-design/icons";

export interface ActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ActionButtonsProps {
  /** Array of action items */
  actions: ActionItem[];
  /** Display mode */
  mode?: "dropdown" | "inline" | "auto";
  /** Max inline actions before switching to dropdown (for auto mode) */
  maxInline?: number;
  /** Size of buttons */
  size?: "small" | "middle" | "large";
}

/**
 * Common action presets
 */
export const ActionPresets = {
  view: (onClick: () => void): ActionItem => ({
    key: "view",
    label: "Ver detalles",
    icon: <EyeOutlined />,
    onClick,
  }),
  edit: (onClick: () => void): ActionItem => ({
    key: "edit",
    label: "Editar",
    icon: <EditOutlined />,
    onClick,
  }),
  delete: (onClick: () => void): ActionItem => ({
    key: "delete",
    label: "Eliminar",
    icon: <DeleteOutlined />,
    danger: true,
    onClick,
  }),
  duplicate: (onClick: () => void): ActionItem => ({
    key: "duplicate",
    label: "Duplicar",
    icon: <CopyOutlined />,
    onClick,
  }),
};

/**
 * Ant Design Action Buttons component
 * Displays actions as inline buttons or dropdown menu
 *
 * @example
 * // Dropdown mode
 * <ActionButtons
 *   actions={[
 *     ActionPresets.view(() => handleView(record)),
 *     ActionPresets.edit(() => handleEdit(record)),
 *     ActionPresets.delete(() => handleDelete(record)),
 *   ]}
 * />
 *
 * // Inline mode
 * <ActionButtons
 *   mode="inline"
 *   actions={[
 *     ActionPresets.edit(() => handleEdit(record)),
 *     ActionPresets.delete(() => handleDelete(record)),
 *   ]}
 * />
 */
export function ActionButtons({
  actions,
  mode = "dropdown",
  maxInline = 2,
  size = "small",
}: ActionButtonsProps) {
  // Determine actual mode for auto
  const actualMode =
    mode === "auto"
      ? actions.length <= maxInline
        ? "inline"
        : "dropdown"
      : mode;

  if (actualMode === "inline") {
    return (
      <Space size="small">
        {actions.map((action) => (
          <Button
            key={action.key}
            type="text"
            size={size}
            icon={action.icon}
            danger={action.danger}
            disabled={action.disabled}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </Button>
        ))}
      </Space>
    );
  }

  // Dropdown mode
  const menuItems: MenuProps["items"] = actions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
    onClick: () => action.onClick(),
  }));

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Button
        type="text"
        size={size}
        icon={<MoreOutlined />}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
}
