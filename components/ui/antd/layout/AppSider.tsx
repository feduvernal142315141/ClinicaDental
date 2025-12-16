"use client";

import { Layout } from "antd";
import { MedicineBoxOutlined } from "@ant-design/icons";
import { NavMenu } from "@/components/ui/antd/navigation/NavMenu";
import { Text } from "@/components/ui/antd/typography/Text";
import { useTheme } from "@/hooks/use-theme";
import { LucideIcon } from "lucide-react";

const { Sider } = Layout;

interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface AppSiderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  currentPath: string;
  mainMenuItems: MenuItem[];
  onNavigate: (path: string) => void;
}

/**
 * Ant Design App Sider component
 * Simple collapsible sidebar with logo and navigation menu
 * Uses native Ant Design collapse trigger
 */
export function AppSider({
  collapsed,
  onCollapse,
  currentPath,
  mainMenuItems,
  onNavigate,
}: AppSiderProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      className="hidden lg:block"
      width={220}
      theme={isDark ? "dark" : "light"}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center gap-2 mb-6 "
        style={{ height: 64 }}
      >
        <MedicineBoxOutlined
          style={{
            fontSize: 28,
            color: "#1677ff",
          }}
        />
        {!collapsed && (
          <Text size="base" weight="semibold" className="whitespace-nowrap">
            Sistema Médico
          </Text>
        )}
      </div>

      {/* Navigation Menu */}
      <NavMenu
        items={mainMenuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        collapsed={collapsed}
        theme={isDark ? "dark" : "light"}
      />
    </Sider>
  );
}
