"use client";

import { Layout } from "antd";
import { MedicineBoxOutlined } from "@ant-design/icons";
import { NavMenu, MenuItem } from "@/components/ui/antd/navigation/NavMenu";
import { Text } from "@/components/ui/antd/typography/Text";
import { useTheme } from "@/lib/hooks/use-theme";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";

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
  const { name: clinicName, logoUrl } = useClinicBranding();

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      className="hidden lg:block"
      width={240}
      theme={isDark ? "dark" : "light"}
    >
      {/* Logo: imagen de la clínica (branding público) si existe, si no el
          ícono por defecto. NOTA: este componente no está montado hoy en el
          árbol activo (el shell real es components/layout/sidebar.tsx), se
          mantiene sincronizado con `ClinicBrandingProvider` por si se
          reactiva. */}
      <div
        className="flex items-center justify-center gap-2 mb-6 "
        style={{ height: 64 }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo de ${clinicName}`}
            className="h-7 w-7 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <MedicineBoxOutlined
            style={{
              fontSize: 28,
              color: "#1677ff",
            }}
          />
        )}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <Text size="base" weight="semibold" className="whitespace-nowrap">
            {clinicName}
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
