"use client";

import { Layout, Button, Space, Badge } from "antd";
import {
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { ThemeSwitch } from "@/components/ui/antd/feedback/ThemeSwitch";
import { UserDropdown } from "@/components/ui/antd/navigation/UserDropdown";
import { AppBreadcrumb } from "@/components/ui/antd/navigation/AppBreadcrumb";

const { Header } = Layout;

interface AppHeaderAntdProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  onLogout: () => void;
  onProfile?: () => void;
  onSupport?: () => void;
  onSettings?: () => void;
  onNotificationsClick?: () => void;
  showCollapseButton?: boolean;
  notificationCount?: number;
}

/**
 * Ant Design App Header component
 * Contains search, notifications, theme toggle, and user dropdown
 */
export function AppHeaderAntd({
  userName,
  userEmail,
  userAvatar,
  onLogout,
  onProfile,
  onSupport,
  onSettings,
  onNotificationsClick,
  notificationCount = 0,
}: AppHeaderAntdProps) {
  return (
    <Header
      className="flex items-center justify-between px-4 lg:px-6 rounded-tl-4xl"
      style={{
        background: "var(--background, #fff)",
        borderBottom: "1px solid var(--border, #f0f0f0)",
        height: 64,
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left section - Breadcrumb */}
      <div className="flex items-center gap-4">
        <AppBreadcrumb />
      </div>

      {/* Right section */}
      <Space size="middle" align="center">
        <Badge count={notificationCount} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            onClick={onNotificationsClick}
          />
        </Badge>
        <ThemeSwitch />
        <UserDropdown
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          onLogout={onLogout}
          onProfile={onProfile}
          onSupport={onSupport}
          onSettings={onSettings}
        />
      </Space>
    </Header>
  );
}
