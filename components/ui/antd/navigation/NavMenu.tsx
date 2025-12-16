"use client";

import { Menu } from "antd";
import type { MenuProps } from "antd";
import { LucideIcon } from "lucide-react";
import { createElement } from "react";

interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface NavMenuProps {
  items: MenuItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
  mode?: "vertical" | "inline";
  theme?: "light" | "dark";
  className?: string;
}

/**
 * Ant Design Navigation Menu component
 * Renders a vertical menu with icons and labels
 * Tooltips are handled automatically by Ant Design when collapsed
 */
export function NavMenu({
  items,
  currentPath,
  onNavigate,
  collapsed = false,
  mode = "inline",
  theme: menuTheme = "dark",
  className,
}: NavMenuProps) {
  const getActiveKey = () => {
    const activeItem = items.find(
      (item) =>
        currentPath === item.path || currentPath.startsWith(`${item.path}/`)
    );
    return activeItem?.path || "";
  };

  const menuItems: MenuProps["items"] = items.map((item) => ({
    key: item.path,
    icon: createElement(item.icon, { size: 18 }),
    label: item.label,
    onClick: () => onNavigate(item.path),
  }));

  return (
    <Menu
      theme={menuTheme}
      mode={mode}
      selectedKeys={[getActiveKey()]}
      items={menuItems}
      className={className}
      inlineCollapsed={collapsed}
    />
  );
}
