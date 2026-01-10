"use client";

import { Layout } from "antd";
import { MedicineBoxOutlined } from "@ant-design/icons";
import { NavMenu, MenuItem } from "@/components/ui/antd/navigation/NavMenu";
import { Text } from "@/components/ui/antd/typography/Text";
import { useTheme } from "@/lib/hooks/use-theme";

const { Sider } = Layout;

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
      width={240}
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
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <Text size="base" weight="semibold" className="whitespace-nowrap">
            Sistema Médico
          </Text>
        </div>
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
