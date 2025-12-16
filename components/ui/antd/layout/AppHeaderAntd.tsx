"use client";

import { Layout, Button, Space, Badge, Typography } from "antd";
import {
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { SearchBox } from "@/components/ui/antd/forms/SearchBox";
import { ThemeSwitch } from "@/components/ui/antd/feedback/ThemeSwitch";
import { UserDropdown } from "@/components/ui/antd/navigation/UserDropdown";

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
  collapsed,
  onToggleCollapse,
  userName,
  userEmail,
  userAvatar,
  onLogout,
  onProfile,
  onSupport,
  onSettings,
  onNotificationsClick,
  showCollapseButton = false,
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
      {/* Left section */}
      <div className="flex items-center gap-4">
        {showCollapseButton && onToggleCollapse && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onToggleCollapse}
            className="hidden lg:flex"
          />
        )}
      </div>

      {/* Center - Search */}
      <div className="flex-1 flex justify-center max-w-md mx-4">
        <SearchBox placeholder="Search..." className="w-full" />
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
