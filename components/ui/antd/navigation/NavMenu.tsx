"use client";

import { Menu } from "antd";
import type { MenuProps } from "antd";
import { LucideIcon } from "lucide-react";
import { createElement } from "react";

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  children?: MenuItem[];
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
 * Supports nested sub-menus via children property
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
  // Get active key based on current path
  const getActiveKey = (): string => {
    // Check in children first
    for (const item of items) {
      if (item.children) {
        const childMatch = item.children.find(
          (child) =>
            currentPath === child.path ||
            currentPath.startsWith(`${child.path}/`)
        );
        if (childMatch) return childMatch.path;
      }
    }
    // Then check top-level items
    const activeItem = items.find(
      (item) =>
        currentPath === item.path || currentPath.startsWith(`${item.path}/`)
    );
    return activeItem?.path || "";
  };

  // Get open keys for sub-menus
  const getOpenKeys = (): string[] => {
    const openKeys: string[] = [];
    for (const item of items) {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) =>
            currentPath === child.path ||
            currentPath.startsWith(`${child.path}/`)
        );
        if (hasActiveChild || currentPath.startsWith(`${item.path}/`)) {
          openKeys.push(item.path);
        }
      }
    }
    return openKeys;
  };

  // Build menu items recursively
  const buildMenuItems = (menuItems: MenuItem[]): MenuProps["items"] => {
    return menuItems.map((item) => {
      if (item.children && item.children.length > 0) {
        return {
          key: item.path,
          icon: createElement(item.icon, { size: 18 }),
          label: item.label,
          children: buildMenuItems(item.children),
        };
      }
      return {
        key: item.path,
        icon: createElement(item.icon, { size: 18 }),
        label: item.label,
        onClick: () => onNavigate(item.path),
      };
    });
  };

  const menuItems = buildMenuItems(items);

  return (
    <Menu
      theme={menuTheme}
      mode={mode}
      selectedKeys={[getActiveKey()]}
      defaultOpenKeys={collapsed ? [] : getOpenKeys()}
      items={menuItems}
      className={className}
      inlineCollapsed={collapsed}
    />
  );
}
