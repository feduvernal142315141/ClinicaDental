"use client";

import { Layout, ConfigProvider, theme, App } from "antd";
import { useState } from "react";
import { useTheme } from "@/lib/hooks/use-theme";
import { useAppShell } from "@/lib/hooks/use-app-shell";
import { useAuth } from "@/lib/contexts/auth-context";
import { AppSider } from "./AppSider";
import { AppHeaderAntd } from "./AppHeaderAntd";
import { MobileHeaderAntd } from "./MobileHeaderAntd";
import { ChangePasswordModal } from "@/components/doctors";

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
 *
 * Note: Public routes (login, register) will render without the shell
 */
export function AppShellAntd({ children }: AppShellAntdProps) {
  const { theme: currentTheme } = useTheme();
  const { user } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const {
    sidebarCollapsed,
    pathname,
    isPublic,
    userName,
    userEmail,
    userRole,
    mainMenuItems,
    handleNavigate,
    handleLogout,
    handleProfile,
    handleSupport,
    toggleSidebar,
    openMobileDrawer,
    setSidebarCollapsed,
  } = useAppShell();

  // ConfigProvider wrapper for theme
  const configProviderProps = {
    theme: {
      algorithm:
        currentTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        borderRadius: 8,
        colorPrimary: "#1677ff",
      },
    },
  };

  // If it's a public route, render without shell
  if (isPublic) {
    return (
      <ConfigProvider {...configProviderProps}>
        <App>{children}</App>
      </ConfigProvider>
    );
  }

  // Render full app shell for protected routes
  return (
    <ConfigProvider {...configProviderProps}>
      <App>
        <Layout style={{ minHeight: "100vh" }}>
          {/* Desktop Sidebar */}
          <AppSider
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
            currentPath={pathname}
            mainMenuItems={mainMenuItems}
            onNavigate={handleNavigate}
          />

          {/* Main Layout */}
          <Layout className="flex-1">
            {/* Mobile Header */}
            <MobileHeaderAntd
              onToggleSidebar={openMobileDrawer}
              userName={userName}
              userRole={userRole}
            />

            {/* Desktop Header */}
            <div className="hidden lg:block">
              <AppHeaderAntd
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebar}
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
                onProfile={handleProfile}
                onChangePassword={() => setChangePasswordOpen(true)}
                onSupport={handleSupport}
                showCollapseButton={false}
              />
            </div>

            {/* Content */}
            <Content
              className="flex-1 overflow-auto rounded-bl-4xl"
              style={{
                padding: 24,
                background: currentTheme === "dark" ? "#141414" : "#ffffff",
                height: "calc(100vh - 64px)",
              }}
            >
              <div className="min-h-full rounded-lg">{children}</div>
            </Content>
          </Layout>
        </Layout>

        {user?.id && (
          <ChangePasswordModal
            open={changePasswordOpen}
            doctorId={user.id}
            onClose={() => setChangePasswordOpen(false)}
          />
        )}
      </App>
    </ConfigProvider>
  );
}
