"use client";

import { useState } from "react";
import { Layout, ConfigProvider, theme } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { useTheme } from "@/hooks/use-theme";
import { AppSider } from "./AppSider";
import { AppHeaderAntd } from "./AppHeaderAntd";
import { MobileDrawer } from "./MobileDrawer";
import { MobileHeaderAntd } from "./MobileHeaderAntd";

const { Content } = Layout;

interface AppShellAntdProps {
  children: React.ReactNode;
}

/**
 * Main Application Shell using Ant Design
 * Provides the complete layout structure with:
 * - Responsive sidebar (collapsible on desktop, drawer on mobile)
 * - Header with search, notifications, theme toggle, and user menu
 * - Main content area
 * - Theme integration with next-themes
 */
export function AppShellAntd({ children }: AppShellAntdProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme: currentTheme } = useTheme();

  // Get user role for navigation - default to "admin" if not set
  const userRole = user?.roleName || "admin";
  const userName = user?.email?.split("@")[0] || "Usuario";
  const userEmail = user?.email || "";

  // Pass the role to get proper menu items
  const { mainMenuItems, secondaryMenuItems } = useSidebarNavigation(userRole);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleProfile = () => {
    router.push("/settings/profile");
  };

  const handleSupport = () => {
    router.push("/support");
  };

  return (
    <ConfigProvider
      theme={{
        algorithm:
          currentTheme === "dark"
            ? theme.darkAlgorithm
            : theme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: "#1677ff",
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        {/* Desktop Sidebar */}
        <AppSider
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          currentPath={pathname}
          mainMenuItems={mainMenuItems}
          onNavigate={handleNavigate}
        />

        {/* Mobile Drawer
        <MobileDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          currentPath={pathname}
          mainMenuItems={mainMenuItems}
          secondaryMenuItems={secondaryMenuItems}
          onNavigate={handleNavigate}
          userName={userName}
          userEmail={userEmail}
          onLogout={handleLogout}
          onProfile={handleProfile}
          onSupport={handleSupport}
        /> */}

        {/* Main Layout */}
        <Layout className="flex-1">
          {/* Mobile Header */}
          <MobileHeaderAntd
            onToggleSidebar={() => setMobileDrawerOpen(true)}
            userName={userName}
            userRole={userRole}
          />

          {/* Desktop Header */}
          <div className="hidden lg:block">
            <AppHeaderAntd
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              userName={userName}
              userEmail={userEmail}
              onLogout={handleLogout}
              onProfile={handleProfile}
              onSupport={handleSupport}
              showCollapseButton={false}
            />
          </div>

          {/* Content */}
          <Content
            className="flex-1 overflow-auto rounded-bl-4xl"
            style={{
              padding: 24,
              background: "var(--background, #fff)",
              height: "calc(100vh - 64px)",
            }}
          >
            <div className="min-h-full rounded-lg">{children}</div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
